import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

const xmlStr = fs.readFileSync('stock_summary_response_detailed.xml', 'utf8');
const parser = new XMLParser({ ignoreAttributes: true });
const obj = parser.parse(xmlStr);

const names = Array.isArray(obj.ENVELOPE.DSPACCNAME) ? obj.ENVELOPE.DSPACCNAME : [obj.ENVELOPE.DSPACCNAME];
const infos = Array.isArray(obj.ENVELOPE.DSPSTKINFO) ? obj.ENVELOPE.DSPSTKINFO : [obj.ENVELOPE.DSPSTKINFO];

console.log(`Found ${names.length} names and ${infos.length} infos`);
for (let i = 0; i < Math.min(10, names.length); i++) {
    console.log(names[i]?.DSPDISPNAME, infos[i]);
}
