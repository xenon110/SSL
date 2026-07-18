import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

const xmlStr = fs.readFileSync('stock_summary_response_detailed_2.xml', 'utf8');
const parser = new XMLParser({ ignoreAttributes: true });
const obj = parser.parse(xmlStr);

const names = Array.isArray(obj.ENVELOPE.DSPACCNAME) ? obj.ENVELOPE.DSPACCNAME : [obj.ENVELOPE.DSPACCNAME];
const infos = Array.isArray(obj.ENVELOPE.DSPSTKINFO) ? obj.ENVELOPE.DSPSTKINFO : [obj.ENVELOPE.DSPSTKINFO];

let totalInQty = 0;
let totalInVal = 0;
let totalOutQty = 0;
let totalOutVal = 0;

for (let i = 0; i < names.length; i++) {
    const dispName = names[i]?.DSPDISPNAME;
    if (!dispName) continue;
    
    // We only want the high level groups, but we requested EXPLODEALLLEVELS. 
    // Wait, the XML has groups AND items. If we just sum everything, we'll double count!
    // But let's just see if we can find the Raw Material group values.
    
    const info = infos[i];
    if (info) {
        const inQtyStr = info.DSPSTKIN?.DSPINQTY || '';
        const inValStr = info.DSPSTKIN?.DSPDRAMTA || '';
        const outQtyStr = info.DSPSTKOUT?.DSPOUTQTY || '';
        const outValStr = info.DSPSTKOUT?.DSPNETTCRAMTA || '';
        
        console.log(dispName, 'IN:', inQtyStr, inValStr, 'OUT:', outQtyStr, outValStr);
    }
}
