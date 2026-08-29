export const storageCliSnippets = {
  title: "0G Storage CLI Snippets",
  install: `git clone https://github.com/0gfoundation/0g-storage-client.git
cd 0g-storage-client
go build`,
  upload: `0g-storage-client upload \\
  --url <blockchain_rpc_endpoint> \\
  --key <private_key> \\
  --indexer <storage_indexer_endpoint> \\
  --file <file_path>`,
  download: `0g-storage-client download \\
  --indexer <storage_indexer_endpoint> \\
  --root <file_root_hash> \\
  --file <output_file_path>`,
  downloadWithProof: `0g-storage-client download \\
  --indexer <storage_indexer_endpoint> \\
  --root <file_root_hash> \\
  --file <output_file_path> \\
  --proof`,
  kvWrite: `0g-storage-client kv-write \\
  --url <blockchain_rpc_endpoint> \\
  --key <private_key> \\
  --indexer <storage_indexer_endpoint> \\
  --stream-id <stream_id> \\
  --stream-keys "key1,key2,key3" \\
  --stream-values "value1,value2,value3"`,
  kvRead: `0g-storage-client kv-read \\
  --node <kv_node_rpc_endpoint> \\
  --stream-id <stream_id> \\
  --stream-keys <comma_separated_keys>`,
};
