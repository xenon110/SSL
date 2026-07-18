import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

const xmlStr = fs.readFileSync('stock_summary_ultimate.xml', 'utf8');
const parser = new XMLParser({ ignoreAttributes: true });
const obj = parser.parse(xmlStr);

const names = Array.isArray(obj.ENVELOPE.DSPACCNAME) ? obj.ENVELOPE.DSPACCNAME : [obj.ENVELOPE.DSPACCNAME];
const infos = Array.isArray(obj.ENVELOPE.DSPSTKINFO) ? obj.ENVELOPE.DSPSTKINFO : [obj.ENVELOPE.DSPSTKINFO];

let totalIn = 0;
for (let i = 0; i < names.length; i++) {
    const dispName = names[i]?.DSPDISPNAME;
    if (!dispName) continue;
    
    const info = infos[i];
    if (info) {
        const inQtyStr = info.DSPSTKIN?.DSPINQTY || '';
        const inValStr = info.DSPSTKIN?.DSPINAMTA || info.DSPSTKIN?.DSPDRAMTA || info.DSPSTKIN?.DSPNETTCRAMTA || '';
        const outQtyStr = info.DSPSTKOUT?.DSPOUTQTY || '';
        const outValStr = info.DSPSTKOUT?.DSPOUTAMTA || info.DSPSTKOUT?.DSPNETTCRAMTA || info.DSPSTKOUT?.DSPDRAMTA || '';
        
        if (inValStr || outValStr) {
            console.log(dispName, 'IN:', inQtyStr, inValStr, 'OUT:', outQtyStr, outValStr);
            totalIn += Math.abs(parseFloat(inValStr) || 0);
        }
    }
}
console.log('Total IN:', totalIn);
