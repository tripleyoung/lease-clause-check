//! 법제처 국가법령정보 공동활용 OpenAPI (open.law.go.kr) Rust MCP 서버 (`law-mcp-rs`).
//!
//! 지원 모드:
//! 1. 표준 MCP JSON-RPC 2.0 (stdio): `law-mcp` (Claude Desktop, Cursor, Antigravity 등 MCP 호스트 연결용)
//! 2. HTTP JSON-RPC & REST 브리지: `law-mcp --http 127.0.0.1:8788` (웹 서버 및 전자계약 데모 연동용)

use anyhow::{Context, Result};
use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    env,
    io::{self, BufRead, Write},
    sync::Arc,
    time::Duration,
};

#[derive(Clone)]
struct AppState {
    http: Client,
    oc: String,
}

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    #[allow(dead_code)]
    jsonrpc: Option<String>,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct LiveStatuteInfo {
    #[serde(rename = "lawName")]
    law_name: String,
    article: String,
    ministry: String,
    #[serde(rename = "effectiveDate")]
    effective_date: String,
    #[serde(rename = "proclamationNo")]
    proclamation_no: String,
    #[serde(rename = "articleText")]
    article_text: String,
    #[serde(rename = "officialUrl")]
    official_url: String,
    #[serde(rename = "sourceType")]
    source_type: String,
}

#[derive(Debug, Serialize)]
struct LivePrecedentInfo {
    id: String,
    #[serde(rename = "caseNumber")]
    case_number: String,
    #[serde(rename = "caseName")]
    case_name: String,
    #[serde(rename = "courtName")]
    court_name: String,
    #[serde(rename = "decisionDate")]
    decision_date: String,
    summary: String,
    #[serde(rename = "officialUrl")]
    official_url: String,
}

struct ItemMapping {
    target: &'static str,
    law_id: &'static str,
    jo: Option<&'static str>,
    law_name: &'static str,
    article_label: &'static str,
    ministry_fallback: &'static str,
    prec_query: &'static str,
}

fn get_item_mapping(item_id: &str) -> ItemMapping {
    match item_id {
        "move_in_and_fixed_date" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000302"),
            law_name: "주택임대차보호법",
            article_label: "제3조의2(보증금의 회수)",
            ministry_fallback: "법무부",
            prec_query: "주택임대차보호법 전입신고 확정일자 우선변제권",
        },
        "landlord_info" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000307"),
            law_name: "주택임대차보호법",
            article_label: "제3조의7(임대인의 정보 제시 의무)",
            ministry_fallback: "법무부",
            prec_query: "임대차보증금 국세 우선",
        },
        "deposit_return" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000400"),
            law_name: "주택임대차보호법",
            article_label: "제4조(임대차기간 등)",
            ministry_fallback: "법무부",
            prec_query: "임대차보증금 반환 동시이행",
        },
        "term_two_years" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000400"),
            law_name: "주택임대차보호법",
            article_label: "제4조(임대차기간 등)",
            ministry_fallback: "법무부",
            prec_query: "주택임대차보호법 제4조 임대차기간",
        },
        "renewal_right" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000603"),
            law_name: "주택임대차보호법",
            article_label: "제6조의3(계약갱신 요구 등)",
            ministry_fallback: "법무부",
            prec_query: "주택임대차 계약갱신요구",
        },
        "rent_increase" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000700"),
            law_name: "주택임대차보호법",
            article_label: "제7조(차임 등의 증감청구권)",
            ministry_fallback: "법무부",
            prec_query: "차임 증액 청구",
        },
        "early_exit" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000602"),
            law_name: "주택임대차보호법",
            article_label: "제6조의2(묵시적 갱신의 경우 계약의 해지)",
            ministry_fallback: "법무부",
            prec_query: "주택임대차 묵시적 갱신 해지",
        },
        "repair_duty" => ItemMapping {
            target: "law",
            law_id: "001706",
            jo: Some("062300"),
            law_name: "민법",
            article_label: "제623조(임대인의 의무)",
            ministry_fallback: "법무부",
            prec_query: "임대인 수선의무 파손",
        },
        "restoration" => ItemMapping {
            target: "law",
            law_id: "001706",
            jo: Some("061500"),
            law_name: "민법",
            article_label: "제615조(차주의 원상회복의무와 철거권)",
            ministry_fallback: "법무부",
            prec_query: "임대차 원상회복 보증금",
        },
        "owner_change" => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000300"),
            law_name: "주택임대차보호법",
            article_label: "제3조 제4항(임차주택 양수인의 지위 승계)",
            ministry_fallback: "법무부",
            prec_query: "임차주택 양수인 임대인 지위 승계",
        },
        "refund_allowed" => ItemMapping {
            target: "law",
            law_id: "000354",
            jo: Some("003100"),
            law_name: "방문판매 등에 관한 법률",
            article_label: "제31조(계속거래 계약의 해지)",
            ministry_fallback: "공정거래위원회",
            prec_query: "방문판매 계속거래 계약 해지 위약금",
        },
        "penalty_rate" => ItemMapping {
            target: "law",
            law_id: "000667",
            jo: Some("000800"),
            law_name: "약관의 규제에 관한 법률",
            article_label: "제8조(손해배상액의 예정)",
            ministry_fallback: "공정거래위원회",
            prec_query: "약관규제법 과다한 손해배상액 예정 무효",
        },
        "price_basis" => ItemMapping {
            target: "law",
            law_id: "000354",
            jo: Some("003200"),
            law_name: "방문판매 등에 관한 법률",
            article_label: "제32조(계약 해지 또는 해제의 효과와 위약금 등)",
            ministry_fallback: "공정거래위원회",
            prec_query: "계속거래 해지 환급 위약금",
        },
        "before_start" | "business_fault" | "ad_mismatch" | "gift_return" => ItemMapping {
            target: "admrul",
            law_id: "2100000270136",
            jo: None,
            law_name: "소비자분쟁해결기준",
            article_label: "소비자분쟁해결기준 (체력단련장업)",
            ministry_fallback: "공정거래위원회",
            prec_query: "약관규제법 계약 해지 환불",
        },
        _ => ItemMapping {
            target: "law",
            law_id: "001248",
            jo: Some("000300"),
            law_name: "주택임대차보호법",
            article_label: "제3조(대항력 등)",
            ministry_fallback: "법무부",
            prec_query: "주택임대차보호법 대항력 근저당권",
        },
    }
}

fn format_date_str(raw: &str) -> String {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 8 {
        format!("{}.{}.{}", &digits[0..4], &digits[4..6], &digits[6..8])
    } else {
        raw.to_string()
    }
}

fn clean_html(raw: &str) -> String {
    let replaced = raw
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("<br>", "\n")
        .replace("<BR/>", "\n");
    let mut out = String::with_capacity(replaced.len());
    let mut in_tag = false;
    for ch in replaced.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out.trim().to_string()
}

fn mcp_tools_list() -> Value {
    json!({
        "tools": [
            {
                "name": "search_law",
                "description": "법제처 국가법령정보센터(open.law.go.kr)에서 현행 법령 목록을 검색합니다.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "검색할 법령명 (예: 주택임대차보호법, 민법)" }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_law_article",
                "description": "법령 ID와 조문 번호(6자리 JO 코드)로 현행 법령의 특정 조문 원문과 시행일자를 조회합니다.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "law_id": { "type": "string", "description": "법령 ID (예: 001248=주택임대차보호법, 001706=민법)" },
                        "jo": { "type": "string", "description": "6자리 조문 번호 (예: 000300=제3조, 000302=제3조의2, 062300=제623조)" }
                    },
                    "required": ["law_id", "jo"]
                }
            },
            {
                "name": "search_precedent",
                "description": "대법원 판례를 키워드로 검색하여 사건번호, 선고일자, 사건명, 판례일련번호를 반환합니다.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "검색 키워드 (예: 임대차보증금 반환 동시이행, 임대인 수선의무)" }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_precedent",
                "description": "판례일련번호(ID)로 대법원 판례의 판시사항과 판결요지를 조회합니다.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string", "description": "판례일련번호 (예: 609535)" }
                    },
                    "required": ["id"]
                }
            },
            {
                "name": "inspect_clause_law",
                "description": "계약서 특약 점검 항목(item_id)에 해당하는 현행 법령 조문 및 관련 대법원 판례를 일괄 조회합니다.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "item_id": { "type": "string", "description": "점검 항목 ID (예: no_new_mortgage, repair_duty, deposit_return, renewal_right)" }
                    },
                    "required": ["item_id"]
                }
            }
        ]
    })
}

async fn call_search_law(state: &AppState, query: &str) -> Result<Value> {
    let url = format!(
        "https://www.law.go.kr/DRF/lawSearch.do?OC={}&target=law&type=JSON&query={}",
        state.oc,
        urlencoding_simple(query)
    );
    let data: Value = state.http.get(&url).send().await?.json().await?;
    Ok(data)
}

async fn call_get_law_article(
    state: &AppState,
    law_id: &str,
    jo: &str,
    article_label_fallback: &str,
    law_name_fallback: &str,
    ministry_fallback: &str,
) -> Result<LiveStatuteInfo> {
    let url = format!(
        "https://www.law.go.kr/DRF/lawService.do?OC={}&target=law&ID={}&JO={}&type=JSON",
        state.oc, law_id, jo
    );
    let data: Value = state.http.get(&url).send().await?.json().await?;
    let basic = data
        .get("법령")
        .and_then(|v| v.get("기본정보"))
        .context("missing 기본정보")?;
    let unit_raw = data
        .get("법령")
        .and_then(|v| v.get("조문"))
        .and_then(|v| v.get("조문단위"))
        .context("missing 조문단위")?;
    let unit = if let Some(arr) = unit_raw.as_array() {
        arr.first().context("empty 조문단위")?
    } else {
        unit_raw
    };

    let mut paragraphs = Vec::new();
    if let Some(s) = unit.get("조문내용").and_then(|v| v.as_str()) {
        paragraphs.push(s.trim().to_string());
    }
    if let Some(hang) = unit.get("항") {
        let hang_list: Vec<&Value> = if let Some(arr) = hang.as_array() {
            arr.iter().collect()
        } else {
            vec![hang]
        };
        for h in hang_list {
            if let Some(hc) = h.get("항내용").and_then(|v| v.as_str()) {
                paragraphs.push(hc.trim().to_string());
            }
            if let Some(ho) = h.get("호") {
                let ho_list: Vec<&Value> = if let Some(arr) = ho.as_array() {
                    arr.iter().collect()
                } else {
                    vec![ho]
                };
                for item in ho_list {
                    if let Some(hoc) = item.get("호내용").and_then(|v| v.as_str()) {
                        paragraphs.push(format!("  {}", hoc.trim()));
                    }
                }
            }
        }
    }

    let law_name = basic
        .get("법령명_한글")
        .and_then(|v| v.as_str())
        .unwrap_or(law_name_fallback)
        .to_string();
    let ministry = basic
        .get("소관부처")
        .and_then(|v| v.get("content"))
        .and_then(|v| v.as_str())
        .unwrap_or(ministry_fallback)
        .to_string();
    let effective_date = format_date_str(
        basic
            .get("시행일자")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    let proclamation_no = basic
        .get("공포번호")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| format!("법률 제{s}호"))
        .unwrap_or_default();

    Ok(LiveStatuteInfo {
        official_url: format!("https://www.law.go.kr/법령/{}", urlencoding_simple(&law_name)),
        law_name,
        article: article_label_fallback.to_string(),
        ministry,
        effective_date,
        proclamation_no,
        article_text: paragraphs.join("\n"),
        source_type: "law".to_string(),
    })
}

async fn call_get_admrul(state: &AppState, mapping: &ItemMapping) -> Result<LiveStatuteInfo> {
    let url = format!(
        "https://www.law.go.kr/DRF/lawSearch.do?OC={}&target=admrul&type=JSON&query={}",
        state.oc,
        urlencoding_simple(mapping.law_name)
    );
    let data: Value = state.http.get(&url).send().await?.json().await?;
    let adm_raw = data
        .get("AdmRulSearch")
        .and_then(|v| v.get("admrul"))
        .context("missing admrul")?;
    let adm = if let Some(arr) = adm_raw.as_array() {
        arr.first().context("empty admrul")?
    } else {
        adm_raw
    };
    let law_name = adm
        .get("행정규칙명")
        .and_then(|v| v.as_str())
        .unwrap_or(mapping.law_name)
        .to_string();
    let ministry = adm
        .get("소관부처명")
        .and_then(|v| v.as_str())
        .unwrap_or(mapping.ministry_fallback)
        .to_string();
    let effective_date = format_date_str(
        adm.get("시행일자")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    let proclamation_no = adm
        .get("발령번호")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| format!("{ministry}고시 제{s}호"))
        .unwrap_or_default();

    Ok(LiveStatuteInfo {
        official_url: format!(
            "https://www.law.go.kr/행정규칙/{}",
            urlencoding_simple(&law_name)
        ),
        law_name,
        article: mapping.article_label.to_string(),
        ministry,
        effective_date,
        proclamation_no,
        article_text: String::new(),
        source_type: "admrul".to_string(),
    })
}

async fn call_search_precedents(state: &AppState, query: &str) -> Result<Vec<LivePrecedentInfo>> {
    let url = format!(
        "https://www.law.go.kr/DRF/lawSearch.do?OC={}&target=prec&type=JSON&curt={}&search=2&display=2&query={}",
        state.oc,
        urlencoding_simple("대법원"),
        urlencoding_simple(query)
    );
    let data: Value = state.http.get(&url).send().await?.json().await?;
    let prec_raw = match data.get("PrecSearch").and_then(|v| v.get("prec")) {
        Some(v) => v,
        None => return Ok(Vec::new()),
    };
    let list: Vec<&Value> = if let Some(arr) = prec_raw.as_array() {
        arr.iter().take(2).collect()
    } else {
        vec![prec_raw]
    };

    let mut out = Vec::new();
    for item in list {
        let id = item
            .get("판례일련번호")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let case_number = item
            .get("사건번호")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if case_number.is_empty() {
            continue;
        }
        let case_name = item
            .get("사건명")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let court_name = item
            .get("법원명")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .unwrap_or("대법원")
            .to_string();
        let decision_date = format_date_str(
            item.get("선고일자")
                .and_then(|v| v.as_str())
                .unwrap_or(""),
        );

        let mut summary = String::new();
        if !id.is_empty() {
            let detail_url = format!(
                "https://www.law.go.kr/DRF/lawService.do?OC={}&target=prec&ID={}&type=JSON",
                state.oc, id
            );
            if let Ok(resp) = state.http.get(&detail_url).send().await {
                if let Ok(detail_json) = resp.json::<Value>().await {
                    if let Some(svc) = detail_json.get("PrecService") {
                        let raw_sum = svc
                            .get("판결요지")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .or_else(|| svc.get("판시사항").and_then(|v| v.as_str()))
                            .unwrap_or("");
                        let cleaned = clean_html(raw_sum);
                        summary = if cleaned.chars().count() > 320 {
                            let truncated: String = cleaned.chars().take(320).collect();
                            format!("{}…", truncated.trim())
                        } else {
                            cleaned
                        };
                    }
                }
            }
        }

        out.push(LivePrecedentInfo {
            official_url: format!(
                "https://www.law.go.kr/판례/({})",
                urlencoding_simple(&case_number)
            ),
            id,
            case_number,
            case_name,
            court_name,
            decision_date,
            summary,
        });
    }

    Ok(out)
}

async fn inspect_clause_law(state: &AppState, item_id: &str) -> Value {
    let mapping = get_item_mapping(item_id);
    let statute_res = if mapping.target == "law" {
        if let Some(jo) = mapping.jo {
            call_get_law_article(
                state,
                mapping.law_id,
                jo,
                mapping.article_label,
                mapping.law_name,
                mapping.ministry_fallback,
            )
            .await
        } else {
            call_get_admrul(state, &mapping).await
        }
    } else {
        call_get_admrul(state, &mapping).await
    };

    let precedents = call_search_precedents(state, mapping.prec_query)
        .await
        .unwrap_or_default();

    let (statute, connected) = match statute_res {
        Ok(s) => (s, true),
        Err(_) => (
            LiveStatuteInfo {
                law_name: mapping.law_name.to_string(),
                article: mapping.article_label.to_string(),
                ministry: mapping.ministry_fallback.to_string(),
                effective_date: "현행".to_string(),
                proclamation_no: String::new(),
                article_text: String::new(),
                official_url: format!(
                    "https://www.law.go.kr/법령/{}",
                    urlencoding_simple(mapping.law_name)
                ),
                source_type: mapping.target.to_string(),
            },
            false,
        ),
    };

    json!({
        "itemId": item_id,
        "engine": "law-mcp-rs",
        "oc": state.oc,
        "liveConnected": connected || !precedents.is_empty(),
        "statute": statute,
        "precedents": precedents
    })
}

async fn handle_mcp_request(state: &AppState, req: JsonRpcRequest) -> Option<Value> {
    let id = req.id.clone();
    match req.method.as_str() {
        "notifications/initialized" | "initialized" => None,
        "initialize" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "law-mcp-rs",
                    "version": "0.1.0"
                }
            }
        })),
        "tools/list" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": mcp_tools_list()
        })),
        "tools/call" => {
            let name = req
                .params
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let args = req.params.get("arguments").cloned().unwrap_or(json!({}));

            let tool_output = match name {
                "search_law" => {
                    let q = args.get("query").and_then(|v| v.as_str()).unwrap_or("주택임대차보호법");
                    call_search_law(state, q).await.unwrap_or_else(|e| json!({ "error": e.to_string() }))
                }
                "get_law_article" => {
                    let law_id = args.get("law_id").and_then(|v| v.as_str()).unwrap_or("001248");
                    let jo = args.get("jo").and_then(|v| v.as_str()).unwrap_or("000300");
                    match call_get_law_article(state, law_id, jo, "", "법령", "").await {
                        Ok(s) => serde_json::to_value(s).unwrap_or(json!({})),
                        Err(e) => json!({ "error": e.to_string() }),
                    }
                }
                "search_precedent" => {
                    let q = args.get("query").and_then(|v| v.as_str()).unwrap_or("임대차보증금");
                    match call_search_precedents(state, q).await {
                        Ok(list) => serde_json::to_value(list).unwrap_or(json!([])),
                        Err(e) => json!({ "error": e.to_string() }),
                    }
                }
                "get_precedent" => {
                    let prec_id = args.get("id").and_then(|v| v.as_str()).unwrap_or("609535");
                    let url = format!(
                        "https://www.law.go.kr/DRF/lawService.do?OC={}&target=prec&ID={}&type=JSON",
                        state.oc, prec_id
                    );
                    match state.http.get(&url).send().await {
                        Ok(r) => r.json::<Value>().await.unwrap_or_else(|e| json!({ "error": e.to_string() })),
                        Err(e) => json!({ "error": e.to_string() }),
                    }
                }
                "inspect_clause_law" => {
                    let item_id = args
                        .get("item_id")
                        .or_else(|| args.get("itemId"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("no_new_mortgage");
                    inspect_clause_law(state, item_id).await
                }
                _ => json!({ "error": format!("Unknown tool: {name}") }),
            };

            Some(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": serde_json::to_string_pretty(&tool_output).unwrap_or_default()
                        }
                    ]
                }
            }))
        }
        _ => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": {
                "code": -32601,
                "message": format!("Method not found: {}", req.method)
            }
        })),
    }
}

fn urlencoding_simple(s: &str) -> String {
    let mut out = String::new();
    for b in s.as_bytes() {
        match *b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*b as char)
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

#[derive(Deserialize)]
struct InspectQuery {
    #[serde(rename = "itemId", alias = "item_id")]
    item_id: Option<String>,
}

async fn http_health() -> Json<Value> {
    Json(json!({ "status": "ok", "service": "law-mcp-rs", "version": "0.1.0" }))
}

async fn http_inspect(
    State(state): State<Arc<AppState>>,
    Json(body): Json<InspectQuery>,
) -> Json<Value> {
    let item_id = body.item_id.as_deref().unwrap_or("no_new_mortgage");
    Json(inspect_clause_law(&state, item_id).await)
}

async fn http_mcp_rpc(
    State(state): State<Arc<AppState>>,
    Json(req): Json<JsonRpcRequest>,
) -> Json<Value> {
    Json(
        handle_mcp_request(&state, req)
            .await
            .unwrap_or_else(|| json!({ "ok": true })),
    )
}

#[tokio::main]
async fn main() -> Result<()> {
    let oc = env::var("LAW_API_OC").unwrap_or_else(|_| "tripleyoung".to_string());
    let http = Client::builder()
        .timeout(Duration::from_millis(4500))
        .build()?;
    let state = Arc::new(AppState { http, oc });

    let args: Vec<String> = env::args().collect();

    // 1. CLI 단발 실행 모드 (`law-mcp --inspect <item_id>`)
    if let Some(pos) = args.iter().position(|a| a == "--inspect") {
        let item_id = args
            .get(pos + 1)
            .map(|s| s.as_str())
            .unwrap_or("no_new_mortgage");
        let res = inspect_clause_law(&state, item_id).await;
        println!("{}", serde_json::to_string(&res)?);
        return Ok(());
    }

    // 2. HTTP 데몬 모드 (`law-mcp --http 127.0.0.1:8788`)
    if let Some(pos) = args.iter().position(|a| a == "--http") {
        let addr = args
            .get(pos + 1)
            .map(|s| s.as_str())
            .unwrap_or("127.0.0.1:8788");
        let app = Router::new()
            .route("/health", get(http_health))
            .route("/inspect", post(http_inspect))
            .route("/mcp", post(http_mcp_rpc))
            .with_state(state);

        let listener = tokio::net::TcpListener::bind(addr).await?;
        eprintln!("law-mcp-rs HTTP/MCP server listening on http://{addr}");
        axum::serve(listener, app).await?;
        return Ok(());
    }

    // 3. 기본 MCP JSON-RPC 2.0 (stdio) 모드
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(req) = serde_json::from_str::<JsonRpcRequest>(&line) {
            if let Some(resp) = handle_mcp_request(&state, req).await {
                writeln!(stdout, "{}", serde_json::to_string(&resp)?)?;
                stdout.flush()?;
            }
        }
    }

    Ok(())
}
