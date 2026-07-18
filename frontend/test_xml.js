import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

const xmlStr = fs.readFileSync('bs_response.xml', 'utf8');
const parser = new XMLParser({ ignoreAttributes: true });
const obj = parser.parse(xmlStr);

const names = Array.isArray(obj.ENVELOPE.BSNAME) ? obj.ENVELOPE.BSNAME : [obj.ENVELOPE.BSNAME];
const amts = Array.isArray(obj.ENVELOPE.BSAMT) ? obj.ENVELOPE.BSAMT : [obj.ENVELOPE.BSAMT];

console.log("Names length:", names.length, "Amts length:", amts.length);

for (let i = 0; i < 5; i++) {
    const dispName = names[i]?.DSPACCNAME?.DSPDISPNAME || 'Unknown';
    const mainAmt = amts[i]?.BSMAINAMT;
    const subAmt = amts[i]?.BSSUBAMT;
    console.log(dispName, "->", mainAmt, subAmt);
}
