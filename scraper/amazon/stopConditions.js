function shouldStop({ noGrowthCycles, maxNoGrowthCycles, clicked, growth, atBottom, grew }) {
  if (clicked) return false;
  if (growth > 0) return false;
  if (noGrowthCycles >= maxNoGrowthCycles * 2) return true;
  if (noGrowthCycles >= maxNoGrowthCycles && (atBottom || !grew)) return true;
  return false;
}

module.exports = { shouldStop };
