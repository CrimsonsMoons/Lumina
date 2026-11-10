
(() => {
  const move=(from,to)=>{const source=document.querySelector(from),slot=document.querySelector(to);if(source&&slot)slot.appendChild(source);};
  const side=document.querySelector('aside.sidebar');
  if(side)document.getElementById('tableOptionsContent').appendChild(side);
  move('.seat-picker','#hudSeatSlot');
  move('.chips','#hudChipSlot');
  move('.bet-tools:not(.advanced-tools)','#hudBetToolsSlot');
  move('#maxBet','#hudAllInSlot');
  move('.action-grid','#hudActionSlot');
  move('#primaryAction','#hudPrimarySlot');
  move('#topupChips','#hudJobSlot');
  move('#topupHint','#hudJobSlot');
  move('#insuranceOffer','#hudInsuranceSlot');
})();
