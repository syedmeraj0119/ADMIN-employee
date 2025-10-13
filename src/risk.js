// Simple offline risk analysis module
// Returns: { riskLevel: 'Low'|'Medium'|'High', safe: boolean, reasons: string[] }
export function analyzeDestination(destination = '', startDate = ''){
  const d = (destination || '').toLowerCase();
  const reasons = [];
  let risk = 'Low';

  // keyword-based high-risk list (examples)
  const HIGH = ['syria','afghanistan','yemen','somalia','north korea','iraq'];
  const MED = ['mexico','haiti','venezuela','ukraine','pakistan'];

  for(const k of HIGH){ if(d.includes(k)){ risk = 'High'; reasons.push(`Destination matched high-risk country: ${k}`); break; } }
  if(risk !== 'High'){
    for(const k of MED){ if(d.includes(k)){ if(risk !== 'High') risk = 'Medium'; reasons.push(`Destination matched medium-risk country: ${k}`); break; } }
  }

  // simple city-level heuristics
  if(d.includes('karachi') || d.includes('kabul') || d.includes('moscow')){
    if(risk !== 'High'){ risk = 'Medium'; reasons.push('City-level advisory (localized unrest or travel advisory)'); }
  }

  // season / weather heuristic (hurricane season in some regions Jun-Nov)
  if(startDate){
    try{
      const month = new Date(startDate).getMonth() + 1; // 1-12
      if((d.includes('caribbean') || d.includes('mexico') || d.includes('bahamas') || d.includes('puerto rico')) && month >=6 && month <=11){
        if(risk === 'Low'){ risk = 'Medium'; }
        reasons.push('Trip falls within hurricane season for the destination (Jun–Nov)');
      }
    }catch(e){}
  }

  const safe = risk === 'Low';
  if(reasons.length === 0) reasons.push('No obvious red flags detected by offline analyzer');
  return { riskLevel: risk, safe, reasons };
}
