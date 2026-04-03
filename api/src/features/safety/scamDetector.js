const detectScam = (text) => {
  const t = text.toLowerCase();

  if (t.includes("advance payment") || t.includes("send money")) {
    return "danger";
  }

  if (t.includes("urgent")) {
    return "warning";
  }

  return "safe";
};

export default detectScam;