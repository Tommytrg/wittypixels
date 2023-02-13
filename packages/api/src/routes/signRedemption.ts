import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import keccak from 'keccak'
import secp256k1 from 'secp256k1'
import Web3 from 'web3'
import {
  // ERC20_TOKEN_START_TS,
  ERC721_TOKEN_CURATOR_PK,
  WEB3_PROVIDER,
  // ERC721_TOKEN_ADDRESS,
  // ERC721_TOKEN_ID,
} from '../constants'
// import { calculateLeaf } from '../services/playersTree'
import {
  AuthorizationHeader,
  // JwtVerifyPayload,
  SignRedemptionOutput,
  SignRedemptionParams,
} from '../types'
import { fromHexToUint8Array } from '../utils'

const signRedemption: FastifyPluginAsync = async (
  fastify,
  _opts
): Promise<void> => {
  if (!fastify.mongo.db) throw Error('mongo db not found')

  const { signRedemptionModel } = fastify

  fastify.post<{
    Body: SignRedemptionParams
    Reply: SignRedemptionOutput | Error
  }>('/sign_redemption', {
    schema: {
      body: SignRedemptionParams,
      headers: AuthorizationHeader,
      response: {
        200: SignRedemptionOutput,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: SignRedemptionParams }>,
      reply
    ) => {
      // // Check 0: incubation period
      // if (ERC20_TOKEN_START_TS && !isTimeToMint())
      //   return reply
      //     .status(403)
      //     .send(new Error(`Forbidden: signRedemption is not enabled yet`))

      // // Check 1: token is valid
      // let key: string
      // try {
      //   const decoded: JwtVerifyPayload = fastify.jwt.verify(
      //     request.headers.authorization as string
      //   )
      //   key = decoded.id
      // } catch (err) {
      //   return reply.status(403).send(new Error(`Forbidden: invalid token`))
      // }
      // // Unreachable: valid server issued token refers to non-existent player
      // const player = await playerModel.get(key)
      // if (!player) {
      //   return reply
      //     .status(404)
      //     .send(new Error(`Player does not exist (key: ${key})`))
      // }
      // // Check 3 (unreachable): incubating player egg has been claimed
      // if (!player.token) {
      //   return reply
      //     .status(405)
      //     .send(new Error(`Player has not been claimed yet (key: ${key})`))
      // }
      // // Check 4 (unreachable): player must have database id
      // if (!player.key) {
      //   return reply
      //     .status(405)
      //     .send(new Error(`Player has no id (key: ${key})`))
      // }

      // // If previously signed, reply with same signed output
      // const prevSign = await signRedemptionModel.get(player.creationIndex)
      // if (prevSign) {
      //   return reply.status(200).send(prevSign)
      // }
      const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER))
      // // Check address is valid
      // if (!web3.utils.isAddress(request.body.address)) {
      //   return reply
      //     .status(409)
      //     .send(new Error(`Mint address should be a valid addresss`))
      // }

      // const playerPixels = canvas.countPixels(player.username)

      // const leaf = calculateLeaf(player)
      // if (!stats.merkleTree) {
      //   throw new Error('No tree exists inside stats in /sign_redemption')
      // }
      // const proof = stats.merkleTree.getProof(leaf) as Array<string>
      // if (!proof) {
      //   throw new Error('Proof is empty in /sign_redemption')
      // }

      const test = {
        parentToken: '0x1858cCeC051049Fa1269E958da2d33bCA27c6Db8',
        parentTokenId: '1',
        playerAddress: '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
        playerIndex: '3',
        playerPixels: '77',
        playerPixelsProof: [
          '0x05b8ccbb9d4d8fb16ea74ce3c29a41f1b461fbdaff4714a0d9a8eb05499746bc',
          '0x550b876a53f6484cf42aa55bb6c8fbe2fd01da39646119ba0560d23728394567',
          '0xde31a920dbdd1f015b2a842f0275dc8dec6a82ff94d9b796a36f23c64a3c8332',
        ],
      }

      const message = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'address', 'uint256', 'uint256', 'bytes32[]'],
        [
          test.parentToken,
          test.parentTokenId,
          test.playerAddress,
          test.playerIndex,
          test.playerPixels,
          test.playerPixelsProof,
        ]
      )
      console.log('-----------------------------1', message)
      if (!message) {
        throw Error('Mint failed because signature message is empty')
      }

      // Compute Keccak256 from data
      const messageBuffer = Buffer.from(message.substring(2), 'hex')
      const messageHash = keccak('keccak256').update(messageBuffer).digest()
      console.log('2--------------------------')
      // Sign message
      // Note: web3.eth.accounts.sign is not used because it prefixes the message to sign
      const signatureObj = secp256k1.ecdsaSign(
        messageHash,
        fromHexToUint8Array(ERC721_TOKEN_CURATOR_PK)
      )
      // `V` signature component (V = 27 + recid)
      const signV = (27 + signatureObj.recid).toString(16)
      console.log('4-------------------')
      // Signature = RS | V
      const signature = Buffer.from(signatureObj.signature)
        .toString('hex')
        .concat(signV)

      console.log('signature', signature)
      const deeds = web3.eth.abi.encodeParameters(

        ['address', 'uint256', 'address', 'uint256', 'uint256', 'bytes32[]', 'bytes'],
        [
          test.parentToken,
          test.parentTokenId,
          test.playerAddress,
          test.playerIndex,
          test.playerPixels,
          test.playerPixelsProof,
          '0x' + signature,
        ]
      )
        console.log('6-------------')
      await signRedemptionModel.create({ deeds })
        console.log('7i--------------', deeds)
      return reply.status(200).send({ deeds })
    },
  })
}

export default signRedemption
