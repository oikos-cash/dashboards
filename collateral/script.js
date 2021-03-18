const SUPPORTED_NETWORKS = {
  mainnet: 56,
  shasta: 2,
};

const networkId = SUPPORTED_NETWORKS['mainnet'];
const snxjs = new OikosJs.OikosJs({networkId});
const { formatBytes32String } = OikosJs.OikosJs.utils;
const { synths } = snxjs.contractSettings;
const input = document.querySelector("input[name=address]");

input.addEventListener("change", () => {
  lookup(input.value);
});

const summaryTable = document.querySelector(".flextables *:nth-child(1) table");
const portfolioTable = document.querySelector(
  ".flextables *:nth-child(2) table"
);

const chartTrendingDebtContainer = document.querySelector(
  ".flextables *:nth-child(1) section"
);
const chartPortfolioContainer = document.querySelector(
  ".flextables *:nth-child(2) section"
);

 
const lookup = async (account) => {
  // const account = input.value;
  summaryTable.innerHTML =
    '<img src="https://media.giphy.com/media/XfDWbxWvjQHwjFgenW/giphy.gif" width=50 />';
  portfolioTable.innerHTML = summaryTable.innerHTML;
  //chartTrendingDebtContainer.innerHTML = summaryTable.innerHTML;
  chartPortfolioContainer.innerHTML = summaryTable.innerHTML;

  try {
    const results = await Promise.all([
      snxjs.OikosState.issuanceRatio(),
      snxjs.ExchangeRates.rateForCurrency(formatBytes32String("OKS")),
      snxjs.Oikos.transferableOikos(account),
      snxjs.Oikos.collateral(account),
      snxjs.Oikos.collateralisationRatio(account),
      snxjs.oUSD.balanceOf(account),
      snxjs.Oikos.debtBalanceOf(account, formatBytes32String("oUSD")),
      // TODO: currencyKey here is just for currency conversion of total
      // fees?
      snxjs.FeePool.feesAvailable(account, formatBytes32String("oUSD")),
    ]);

    console.log(snxjs)
    const [
      issuanceRatio,
      usdToSnxPrice,
      unlockedSnx,
      collateral,
      collateralRatio,
      oUSDBalance,
      debtBalance,
      [currentFeesAvailable, currentRewardsAvailable],
    ] = results.map((input) =>
      Array.isArray(input)
        ? input.map(snxjs.utils.formatEther)
        : snxjs.utils.formatEther(input)
    );

    const currentCRatio = (1 / collateralRatio) * 100;
    console.log({ collateralRatio });
//${Math.round( (unlockedSnx / collateral) * 100
//      <tr><th>Ratio</th><td>${Number(collateralRatio).toFixed(5)}</td></tr>

    summaryTable.innerHTML = `
      <tr><th>OKS Price</th><td>${Number(usdToSnxPrice).toFixed(
        5
      )} <b>USD</b></td></tr>
      <tr><th>Total Collateral</th><td>${Number(
        collateral * usdToSnxPrice
      ).toFixed(2)} <b>USD</b> (${Number(collateral).toFixed(2)} <b>OKS</b>)</td></tr>
      <tr><th>Unlocked OKS</th><td>${Number(
        unlockedSnx * usdToSnxPrice
      ).toFixed(2)}  <b>USD</b> (${Number(unlockedSnx).toFixed(2)}  <b>OKS</b>) 
    </td></tr>
      <tr><th>oUSD Balance</th><td>${Number(oUSDBalance).toFixed(
        2
      )}  <b>oUSD</b></td></tr>
      <tr><th>Total Debt</th><td>${Number(debtBalance).toFixed(
        2
      )} <b>oUSD</b></td></tr>
      <tr><th>Collateralization Ratio</th><td>${Math.round(
        currentCRatio
      )}<b> %</b></td></tr>
      <tr><th>Fees Available</th><td>${numbro(currentFeesAvailable).format(
        "0,0.00"
      )}</td></tr>
      <tr><th>Rewards Available</th><td>${numbro(
        currentRewardsAvailable
      ).format("0,0.00")}</td></tr>
    `;
  } catch (err) {
    console.error(err);
    summaryTable.innerHTML = `<span style="color:red">${err}</span>`;
  }

  const availableSynths = synths.filter(({ asset }) => asset);

  const balances = await Promise.all(
    availableSynths.map(({ name }) => snxjs[name].balanceOf(account))
  );

  const balancesEffective = await Promise.all(
    availableSynths.map(({ name }, i) =>
      snxjs.ExchangeRates.effectiveValue(
        formatBytes32String(name),
        balances[i],
        formatBytes32String("oUSD")
      )
    )
  );

  const balancesInUSD = balancesEffective.map(snxjs.utils.formatEther);

  const totalInPortfolio = balancesInUSD.reduce(
    (a, b) => Number(a) + Number(b),
    0
  );

  const holdings = availableSynths
    .map(({ name }, i) => {
      return {
        synthKey: name,
        balanceOf: snxjs.utils.formatEther(balances[i]),
        balanceInUSD: balancesInUSD[i],
        percentage: balancesInUSD[i] / totalInPortfolio,
      };
    })
    .filter(({ balanceOf }) => Number(balanceOf) > 0);

  portfolioTable.innerHTML = `<tr><th>Synth</th><th>Balance</th><th>USD value</th><th>Percentage</th></tr>`;

  holdings
    .sort((a, b) => (Number(a.balanceInUSD) > Number(b.balanceInUSD) ? -1 : 1))
    .forEach(({ synthKey, balanceOf, balanceInUSD, percentage }) => {
      portfolioTable.innerHTML += `<tr><td><b>${synthKey}</b></td><td>${Number(
        balanceOf
      ).toFixed(4)}</td><td><b>$ </b>${Number(balanceInUSD).toFixed(
        2
      )}</td><td>${Number(percentage * 100).toFixed(2)}<b> %</b></td></tr>`;
    });

  // summary row
  portfolioTable.innerHTML += `<tr><td></td><td><b>Total </b></td><td><b>$ </b>${Number(
    totalInPortfolio
  ).toFixed(2)}</td><td></td></tr>`;

  const chart1 = new frappe.Chart(chartPortfolioContainer, {
    data: {
      labels: holdings.map(({ synthKey }) => synthKey),
      datasets: [
        {
          name: "Synth Portfolio",
          values: holdings.map(({ balanceInUSD }) =>
            Number(((balanceInUSD / totalInPortfolio) * 100).toFixed(2))
          ),
        },
      ],
    },
    type: "percentage",
  });
};

const timer = setInterval(async () => {
  if (window.ethereum && !input.value ) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      input.value = accounts[0];
      lookup(input.value);
      clearInterval(timer);
  } else {
      await window.ethereum.enable();
  }
}, 100);
// lookup("TVYGDbvtWv1wPkChzKn5rcQobiHMEN3c3f");
