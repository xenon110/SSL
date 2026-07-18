const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const xml = fs.readFileSync('stock_summary_ultimate.xml', 'utf8');
const parser = new XMLParser({ ignoreAttributes: true });
const parsed = parser.parse(xml);
const names = Array.isArray(parsed.ENVELOPE?.DSPACCNAME) ? parsed.ENVELOPE.DSPACCNAME : [parsed.ENVELOPE?.DSPACCNAME].filter(Boolean);
const infos = Array.isArray(parsed.ENVELOPE?.DSPSTKINFO) ? parsed.ENVELOPE.DSPSTKINFO : [parsed.ENVELOPE?.DSPSTKINFO].filter(Boolean);

let totalProd = 0;
let totalRaw = 0;

for (let i = 0; i < names.length; i++) {
    const rawDispName = names[i]?.DSPDISPNAME;
    if (rawDispName === undefined || rawDispName === null) continue;
    const dispName = String(rawDispName);
    const lowerName = dispName.toLowerCase();
    
    let finalGroup = 'Uncategorized';
    let isRaw = false;
    let isFinished = false;

    if (lowerName.includes('raw') || lowerName.includes('coal') || lowerName.includes('iron ore') || lowerName.includes('dolomite')) {
        isRaw = true;
        finalGroup = 'Raw Material';
    } else if (lowerName.includes('finish') || lowerName.includes('sponge iron') || lowerName.includes('product')) {
        isFinished = true;
        finalGroup = 'Finished Goods';
    }

    const info = infos[i];
    if (info && info.DSPSTKIN) {
        const inValRaw = info.DSPSTKIN.DSPINAMTA || info.DSPSTKIN.DSPDRAMTA || info.DSPSTKIN.DSPNETTCRAMTA || '';
        const outValRaw = info.DSPSTKOUT?.DSPOUTAMTA || info.DSPSTKOUT?.DSPNETTCRAMTA || info.DSPSTKOUT?.DSPDRAMTA || '';
        
        let inQty = 0;
        let inVal = 0;
        let outQty = 0;
        let outVal = 0;
        
        if (info.DSPSTKIN.DSPINQTY) inQty = parseFloat(String(info.DSPSTKIN.DSPINQTY).replace(/[^\d.-]/g, '')) || 0;
        if (inValRaw) inVal = Math.abs(parseFloat(String(inValRaw)) || 0);
        if (info.DSPSTKOUT?.DSPOUTQTY) outQty = parseFloat(String(info.DSPSTKOUT.DSPOUTQTY).replace(/[^\d.-]/g, '')) || 0;
        if (outValRaw) outVal = Math.abs(parseFloat(String(outValRaw)) || 0);

        if (dispName === 'SPONGE IRON') {
            console.log("SPONGE IRON FOUND!");
            console.log("isFinished:", isFinished);
            console.log("inValRaw:", inValRaw);
            console.log("inVal parsed:", inVal);
        }

        if (isFinished) totalProd += inVal;
        if (isRaw) totalRaw += outVal;
    }
}
console.log({ totalProd: totalProd / 2, totalRaw: totalRaw / 2 });
