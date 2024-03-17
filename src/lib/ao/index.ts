import {
  spawn,
  createDataItemSigner,
  message,
  dryrun,
} from "@permaweb/aoconnect";
import { CONTRACT_SRC_TXID, ROUTER_PROCESS } from "@/helpers/constants";
import Arweave from "arweave";
import Ardb from "ardb";

/**
 * Retries a given function up to a maximum number of attempts.
 * @param fn - The asynchronous function to retry, which should return a Promise.
 * @param maxAttempts - The maximum number of attempts to make.
 * @param delay - The delay between attempts in milliseconds.
 * @return A Promise that resolves with the result of the function or rejects after all attempts fail.
 */
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delay: number = 1000
): Promise<T> {
  let attempts = 0;

  const attempt = (): Promise<T> => {
    return fn().catch((error) => {
      attempts += 1;
      if (attempts < maxAttempts) {
        console.log(`Attempt ${attempts} failed, retrying...`);
        return new Promise<T>((resolve) =>
          setTimeout(() => resolve(attempt()), delay)
        );
      } else {
        throw error;
      }
    });
  };

  return attempt();
}

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const ardb = new Ardb(arweave);

async function getAos() {
  const defaultVersion = "1.10.22";
  const defaultModule = "SBNb1qPQ1TDwpD_mboxm2YllmMLXpWw4U8P9Ff8W9vk";
  try {
    const pkg = await (
      await fetch(
        "https://raw.githubusercontent.com/permaweb/aos/main/package.json"
      )
    ).json();
    return {
      version: pkg?.version ?? defaultVersion,
      module: pkg?.aos?.module ?? defaultModule,
    };
  } catch {
    return { version: defaultVersion, module: defaultModule };
  }
}

async function getContractSrc() {
  const src = await (
    await fetch(`https://arweave.net/${CONTRACT_SRC_TXID}`)
  ).text();
  return src;
}

async function findProcess(name: string, aosModule: string, owner: string) {
  const tx = await ardb
    .appName("aos")
    .search("transactions")
    .from(owner)
    .only("id")
    .tags([
      { name: "Data-Protocol", values: ["ao"] },
      { name: "Type", values: ["Process"] },
      {
        name: "Module",
        values: [
          aosModule,
          "1SafZGlZT4TLI8xoc0QEQ4MylHhuyQUblxD8xLKvEKI",
          "9afQ1PLf2mrshqCTZEzzJTR2gWaC9zNPnYgYEqg1Pt4",
        ],
      },
      { name: "Name", values: [name] },
    ])
    .findOne();

  return tx?.id;
}

async function checkIsRegistered(name: string) {
  const { Messages } = await dryrun({
    process: ROUTER_PROCESS,
    tags: [
      { name: "Action", value: "Is-Registered" },
      { name: "Game-Name", value: name },
    ],
  });

  return JSON.parse(Messages[0].Data).isRegistered;
}

export async function createProcess(name: string, owner: string) {
  // check if process is already registered
  const isRegistered = await checkIsRegistered(name);
  if (isRegistered) {
    throw new Error(`Game with name ${name} already registered`);
  }
  // Create a new process
  const { version, module } = await getAos();
  let processId = await findProcess(name, module, owner);
  const scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
  const signer = createDataItemSigner(window.arweaveWallet);
  const tags = [
    { name: "App-Name", value: "aos" },
    { name: "Name", value: name },
    { name: "aos-Version", value: version },
  ];
  const data = "1984";

  if (!processId) {
    processId = await spawn({ module, signer, tags, data, scheduler });
  }

  // Load tictactoe contract to process
  await retry(
    async () =>
      message({
        process: processId,
        tags: [{ name: "Action", value: "Eval" }],
        data: await getContractSrc(),
        signer,
      }),
    5,
    3000
  );

  await retry(
    async () =>
      message({
        process: ROUTER_PROCESS,
        tags: [
          { name: "Action", value: "Register" },
          { name: "Process-Id", value: processId },
          { name: "Game-Name", value: name },
        ],
        signer,
      }),
    5,
    3000
  );

  return processId;
}
