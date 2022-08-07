exports.changeStarToEvaluate = (star) => {
  if (star > 4.5) return "POSITIVE";
  else if (star > 3) return "NEUTRAL";
  else if (star >= 0) return "NEGATIVE";
};
