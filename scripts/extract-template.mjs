import fs from 'fs';

const logPath = '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('Rendered scanned lease contract to:')) {
    console.log('Found line matching contract render');
  }
  if (line.includes('scanned_lease_contract.png') && line.includes('node -e')) {
    try {
      const obj = JSON.parse(line);
      const cmd = obj.tool_calls?.[0]?.args?.CommandLine;
      if (cmd) {
        fs.writeFileSync('/tmp/lease_template.js', cmd);
        console.log('Wrote lease template to /tmp/lease_template.js, length:', cmd.length);
        break;
      }
    } catch (e) {
      // ignore
    }
  }
}
