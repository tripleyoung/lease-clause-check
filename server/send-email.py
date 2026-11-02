#!/usr/bin/env python3
import sys
import argparse
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.header import Header

def main():
    parser = argparse.ArgumentParser(description="Send email with PDF attachment via Gmail SMTP")
    parser.add_argument("--to", required=True, help="Recipient email")
    parser.add_argument("--subject", required=True, help="Email subject")
    parser.add_argument("--body", required=True, help="Email text body")
    parser.add_argument("--pdf", required=False, help="Path to PDF attachment")
    args = parser.parse_args()

    sender = "dudnjsckrgo@gmail.com"
    password = os.environ.get("GMAIL_APP_PASSWORD", "lwvufujftudjxoto")
    recipient = args.to.strip()

    msg = MIMEMultipart()
    msg["From"] = f"온율(溫律) 계약서 안심 진단 서비스 <{sender}>"
    msg["To"] = recipient
    msg["Subject"] = Header(args.subject, "utf-8").encode()

    msg.attach(MIMEText(args.body, "plain", "utf-8"))

    if args.pdf and os.path.exists(args.pdf):
        with open(args.pdf, "rb") as f:
            part = MIMEApplication(f.read(), _subtype="pdf")
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=("utf-8", "", "온율_계약서특약_안심진단_공식리포트.pdf")
            )
            msg.attach(part)
            print(f"[send-email.py] Attached PDF: {args.pdf}")

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
        server.login(sender, password)
        server.sendmail(sender, recipient, msg.as_string())
        server.quit()
        print(f"[send-email.py] Successfully delivered email with PDF to {recipient}")
        sys.exit(0)
    except Exception as e:
        print(f"[send-email.py] Delivery error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
