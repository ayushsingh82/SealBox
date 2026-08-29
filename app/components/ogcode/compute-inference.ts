export const computeInferenceSnippets = {
  title: "0G Compute Inference + Fine-tuning",
  notes: {
    routerVsDirect:
      "Router = single OpenAI-compatible endpoint + unified balance. Direct = per-provider sub-accounts + wallet-signed requests.",
    advancedModeHint:
      "If pc.0g.ai balance looks empty, switch to Advanced mode to view Direct-flow sub-account balances.",
    prerequisites: [
      "Node.js >= 22.0.0",
      "Wallet with 0G tokens",
      "WalletConnect/Web3 wallet for web UI flows",
    ],
  },
  sdkInstall: `pnpm add @0gfoundation/0g-compute-ts-sdk`,
  cliInstall: `pnpm install @0gfoundation/0g-compute-ts-sdk -g`,
  listProviders: `0g-compute-cli inference list-providers`,
  listServicesSdk: `const services = await broker.inference.listService();`,
  localWebUi: `0g-compute-cli ui start-web
# then open http://localhost:3090`,
  setupAndLogin: `0g-compute-cli setup-network
0g-compute-cli login`,
  accountFunding: `# Deposit to main account
0g-compute-cli deposit --amount 3

# Transfer to provider sub-account for inference/fine-tuning
0g-compute-cli transfer-fund --provider <PROVIDER_ADDRESS> --amount 2 --service fine-tuning`,
  fineTuningFlow: `# 1) List providers and models
0g-compute-cli fine-tuning list-providers
0g-compute-cli fine-tuning list-models

# 2) Create task using local dataset (auto-uploads dataset)
0g-compute-cli fine-tuning create-task \\
  --provider <PROVIDER_ADDRESS> \\
  --model <MODEL_NAME> \\
  --dataset-path <PATH_TO_DATASET> \\
  --config-path <PATH_TO_CONFIG_FILE>

# 3) Monitor task
0g-compute-cli fine-tuning get-task --provider <PROVIDER_ADDRESS> --task <TASK_ID>
0g-compute-cli fine-tuning get-log --provider <PROVIDER_ADDRESS> --task <TASK_ID>

# 4) Download + acknowledge when Delivered
0g-compute-cli fine-tuning acknowledge-model \\
  --provider <PROVIDER_ADDRESS> \\
  --task-id <TASK_ID> \\
  --data-path /workspace/output/encrypted_model.bin

# 5) Decrypt after status becomes Finished
0g-compute-cli fine-tuning decrypt-model \\
  --provider <PROVIDER_ADDRESS> \\
  --task-id <TASK_ID> \\
  --encrypted-model /workspace/output/encrypted_model.bin \\
  --output /workspace/output/model_output.zip`,
  configTemplate: `{
  "neftune_noise_alpha": 5,
  "num_train_epochs": 1,
  "per_device_train_batch_size": 2,
  "learning_rate": 0.0002,
  "max_steps": 3
}`,
  datasetFormats: {
    instruction: `{"instruction":"Translate to French","input":"Hello world","output":"Bonjour le monde"}`,
    chat: `{"messages":[{"role":"user","content":"What is 2+2?"},{"role":"assistant","content":"2+2 equals 4."}]}`,
    text: `{"text":"Machine learning is a subset of artificial intelligence."}`,
  },
  commonCommands: {
    getAccount: `0g-compute-cli get-account`,
    getSubAccount: `0g-compute-cli get-sub-account --provider <PROVIDER_ADDRESS>`,
    retrieveFund: `0g-compute-cli retrieve-fund`,
    uploadDataset: `0g-compute-cli fine-tuning upload --data-path <PATH_TO_DATASET>`,
    downloadDataset:
      "0g-compute-cli fine-tuning download --data-path <PATH_TO_SAVE_DATASET> --data-root <DATASET_ROOT_HASH>",
    listTasks: `0g-compute-cli fine-tuning list-tasks --provider <PROVIDER_ADDRESS>`,
    cancelTask: `0g-compute-cli fine-tuning cancel-task --provider <PROVIDER_ADDRESS> --task <TASK_ID>`,
  },
};
