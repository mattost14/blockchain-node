import * as crypto from 'crypto'

class Transaction {
  constructor(
    public amount: number,
    public payer: string, // public key
    public payee: string, // public key
  ) {}

  toString() {
    return JSON.stringify(this);
  }
}

class Block {

  public nonce = Math.round(Math.random() * 999999999);

  constructor(
    public prevHash: string, // previous hash
    public transaction: Transaction,
    public ts = Date.now()
  ){}

  get hash(){
    const str = JSON.stringify(this);
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }
}

class Chain {
  public static instance = new Chain(); // ensure there is only one instance

  chain: Block[];

  constructor() {
    this.chain = [new Block('', new Transaction(100, 'genesis', 'satoshi'))]; 
  }

  get lastBlock() {
    return this.chain[this.chain.length-1]; // return last block in the chain
  }

  mine(nonce: number) {
    let solution =1;
    console.log('⛏ mining ...')

    while(true){
      const hash = crypto.createHash('MD5'); // Similar to SHA256, but with only 128 bits (faster to compute)
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest('hex');

      if(attempt.substr(0,4) === '0000'){
        console.log(`Solved: ${solution}`);
        return solution;
      }
      solution +=1;
    }
  }

  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());
    const isValid = verifier.verify(senderPublicKey, signature);
    
    if(isValid) {
      const newBlock = new Block(this.lastBlock.hash, transaction);
      this.mine(newBlock.nonce);
      
      this.chain.push(newBlock);
    }
  }

}

class Wallet {
  // Wallet gives a user a public/private keypair
  public publicKey: string;
  public privateKey: string;

  constructor (public starter?: boolean) {
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  sendMoney(amount: number, payeePublicKey: string){
    if (this.balance >= amount || this.starter) {
      const transaction = new Transaction(amount, this.publicKey, payeePublicKey);
      const sign = crypto.createSign('SHA256');
      sign.update(transaction.toString()).end();
      const signature = sign.sign(this.privateKey);
      Chain.instance.addBlock(transaction, this.publicKey, signature);
    } else {
      console.log("Not enough balance")
    }
  }

  get balance() {
    let credit = 0;
    let debit = 0;
    Chain.instance.chain.forEach(block => {
        if(block.transaction.payee === this.publicKey) {
          credit += block.transaction.amount;
        }
        if( block.transaction.payer === this.publicKey) {
          debit += block.transaction.amount;
        }
    })
    return credit - debit;
  }

}

// Example usage

const satoshi = new Wallet(true);
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);
alice.sendMoney(10, bob.publicKey);

console.log('Satoshi balance:', satoshi.balance)
console.log('Bob balance:', bob.balance)
console.log('Alice balance:', alice.balance)