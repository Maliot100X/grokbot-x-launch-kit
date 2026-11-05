/** Chat is local encrypted-draft-only; no inbox reads, sends, subscriptions, or decryption. */
export interface EncryptedEnvelope { version:1; algorithm:'external-aead'; ciphertext:string; nonce:string; keyRef:string; }
export interface ChatDraft { id:string; envelope:EncryptedEnvelope; status:'encrypted_pending_review'; }
/** Crypto/key custody is external and unavailable here; never implement encryption with a placeholder. */
export interface DraftSealer { seal(plaintext:string,context:{draftId:string}):Promise<EncryptedEnvelope>; }
export interface EncryptedDraftSink { put(draft:ChatDraft):Promise<void>; }
export async function prepareEncryptedChatDraft(id:string,text:string,sealer:DraftSealer|undefined,sink:EncryptedDraftSink):Promise<void> {
  if (!sealer) throw new Error('Chat draft encryption unavailable');
  if (!id || !text) throw new Error('Empty chat draft');
  const envelope=await sealer.seal(text,{draftId:id});
  if(envelope.version!==1||envelope.algorithm!=='external-aead'||!envelope.ciphertext||!envelope.nonce||!envelope.keyRef) throw new Error('Invalid encrypted envelope');
  await sink.put({id,envelope,status:'encrypted_pending_review'});
}
