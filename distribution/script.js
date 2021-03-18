const tbodyTarget = document.querySelector("tbody");
const inputTarget = document.querySelector("input[name=network]");
const blockTarget = document.querySelector("input[name=block]");
const graphTarget = document.querySelector("#graphCompare");
//const graphTotalIssuedTarget = document.querySelector('#graphTotalIssued');

const networkTarget = document.querySelector("#network var");

const SUPPORTED_NETWORKS = {
  mainnet: 56,
  shasta: 2,
};

const loadingGIF =
  '<img src="https://media.giphy.com/media/XfDWbxWvjQHwjFgenW/giphy.gif" width=50 />';

const start = async () => {
  tbodyTarget.innerHTML = loadingGIF;
  graphTarget.innerHTML = loadingGIF;
  //  graphTotalIssuedTarget.innerHTML = loadingGIF;

  const network =
    inputTarget.value.toLowerCase() in SUPPORTED_NETWORKS
      ? inputTarget.value.toLowerCase()
      : "mainnet";

  networkTarget.innerHTML = network;

  const networkId = SUPPORTED_NETWORKS[network];
  const snxjs = new OikosJs.OikosJs({ networkId });
  const toUtf8Bytes = OikosJs.OikosJs.utils.formatBytes32String;
  // const formatEther = (n) => n.toString(); //;snxjs.utils.formatEther;

  // const fromBlock = blockTarget.value;
  // const blockOptions = fromBlock ? { blockTag: Number(fromBlock) } : {};

  const synths = snxjs.contractSettings.synths.map(({ name }) => name);
  let totalInUSD = 0;
  let snxPrice = await snxjs.ExchangeRates.rateForCurrency(toUtf8Bytes("OKS"));
  snxPrice = Number(snxPrice.toString());
  snxPrice = snxPrice / 1e18;
  let results = await Promise.all(
    synths.map(async (synth) => {
      const totalAmount = await snxjs[synth].totalSupply();

      const totalSupply = Number(totalAmount) / 1e18;
      console.log(synth, { totalSupply });
      let rateForSynth = await snxjs.ExchangeRates.rateForCurrency(
        toUtf8Bytes(synth)
      );
      rateForSynth = rateForSynth.toString();
      rateForSynth = Number(rateForSynth) / 1e18;
      console.log(synth, { rateForSynth });
      const totalSupplyInUSD = rateForSynth * totalSupply;
      totalInUSD += totalSupplyInUSD;
      const rateIsFrozen = await snxjs.ExchangeRates.rateIsFrozen(
        toUtf8Bytes(synth)
      );
      console.log(synth, rateIsFrozen);
      return {
        synth,
        totalAmount,
        totalSupply,
        rateForSynth,
        totalSupplyInUSD,
        rateIsFrozen,
      };
    })
  );

  console.log(results)

  results = results.sort((a, b) =>
    a.totalSupplyInUSD > b.totalSupplyInUSD ? -1 : 1
  );
  tbodyTarget.innerHTML = "";
  results.forEach(
    (
      { synth, rateForSynth, totalSupply, totalSupplyInUSD, rateIsFrozen },
      i
    ) => {
      tbodyTarget.innerHTML += `<tr class="${rateIsFrozen && "frozen"}"><td>${
        i + 1
      }</td><td>${synth}</td><td>${numbro(rateForSynth).format(
        "0.0000"
      )}</td><td>${numbro(totalSupply).format(
        "0,000.0000"
      )} ${synth}</td><td>${numbro(totalSupplyInUSD).format(
        "0,000.00"
      )}</td><td>${numbro((100 * totalSupplyInUSD) / totalInUSD).format(
        "0.00"
      )}%</td>
      </tr>`;
    }
  );
/*
<td>${totalSupply > 0 ? "✅" : "❌"}</td>
<td><a target=_blank style="color:#eb4eb4" href="http://tronscan.org/#/address/${
        window.tronWeb.address.fromHex(snxjs[synth].contract.address)
      }">Holders</a></td>

      */
  document.querySelector("#synthsTotal").innerHTML = numbro(totalInUSD).format(
    "0,000.00"
  ) + `&nbsp;<label style="color:#e4e4f;font-weight:bold">USD</label>`;
  document.querySelector("#oksusdPrice").innerHTML = numbro(snxPrice).format(
    "0.0000"
  ) + `&nbsp;<label style="color:#e4e4f;font-weight:bold">USD</label>`;;

  const resultsWithValues = results.filter(
    ({ totalSupplyInUSD }) => Number(totalSupplyInUSD) >= 0
  );

  const datasets = [
    {
      name: "USD",
      values: resultsWithValues
        .slice(0, 10)
        .map(({ totalSupplyInUSD }) => totalSupplyInUSD),
    },
  ];

  const labels = resultsWithValues.slice(0, 10).map(({ synth }) => synth);

  console.log({ datasets, labels });

  new frappe.Chart(graphTarget, {
    title: "Top 10 Synth Breakdown",
    data: {
      labels,
      datasets,
    },
    type: "bar",
    colors: ["#7cd6fd", "#743ee2"],
  });

  /* Note: no longer works without a provider that supports blockTag (an archive node)
  // track total issued over time
  const currentBlock = await snxjs.contractSettings.provider.getBlockNumber();

  const totalIssuedPromises = [];
  for (i = 0; i < 10; i++) {
    const blockTag = Number(currentBlock) - 6000*i; // approx 1 day
    totalIssuedPromises.unshift(snxjs.Oikos.contract.totalIssuedSynths(toUtf8Bytes('sUSD'), { blockTag }).then(res => ({
      rate: formatEther(res),
      block: blockTag
    })).catch(() => {}));
  }

  const totalIssued = await Promise.all(totalIssuedPromises);

  console.log(totalIssued);

  new frappe.Chart(graphTotalIssuedTarget, {
    title: 'Oikos.totalIssuedSynths over time (by block number, in millions)',
    data: {
      labels: totalIssued.filter(e => e).map(({ block }) => block/1e6),
      datasets: [
        {
          name: 'USD',
          values: totalIssued.filter(e => e).map(({ rate }) => rate/1e6)
        }
      ]
    },
    type: 'line'
//    type: 'bar',
//    colors: ['#7cd6fd', '#743ee2']
  });
  */
};

document.querySelector("button[name=start]").addEventListener("click", start);
window.addEventListener("DOMContentLoaded", start);
