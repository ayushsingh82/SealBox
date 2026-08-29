export const storageSdkSnippets = {
  title: "0G Storage SDK Snippets",
  typescriptQuickstart: `git clone https://github.com/0gfoundation/0g-storage-ts-starter-kit
cd 0g-storage-ts-starter-kit && npm install
cp .env.example .env
npm run upload -- ./file.txt`,
  goInstall: `go get github.com/0gfoundation/0g-storage-client`,
  goImports: `import (
    "context"
    "github.com/0gfoundation/0g-storage-client/common/blockchain"
    "github.com/0gfoundation/0g-storage-client/common"
    "github.com/0gfoundation/0g-storage-client/indexer"
    "github.com/0gfoundation/0g-storage-client/transfer"
    "github.com/0gfoundation/0g-storage-client/core"
)`,
  goInitClients: `w3client := blockchain.MustNewWeb3(evmRpc, privateKey)
defer w3client.Close()

indexerClient, err := indexer.NewClient(indRpc, indexer.IndexerClientOption{
    LogOption: common.LogOption{},
})
if err != nil {
    // Handle error
}`,
  goUpload: `file, err := core.Open(filePath)
if err != nil {
    // Handle error
}
defer file.Close()

fragmentSize := int64(4 * 1024 * 1024 * 1024)
opt := transfer.UploadOption{
    ExpectedReplica:  1,
    TaskSize:         10,
    SkipTx:           true,
    FinalityRequired: transfer.TransactionPacked,
    FastMode:         true,
    Method:           "min",
    FullTrusted:      true,
}

txHashes, roots, err := indexerClient.SplitableUpload(ctx, w3client, file, fragmentSize, opt)`,
  goDownload: `rootHex := rootHash.String()
err = indexerClient.Download(ctx, rootHex, outputPath, withProof)
if err != nil {
    // Handle error
}`,
};
