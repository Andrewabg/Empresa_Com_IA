import type { RealtimeUsage } from '@/server/cost/pricing'

export type VoiceAction =
  | { kind: 'toolCall'; callId: string; name: string; args: Record<string, unknown> }
  
  
  | { kind: 'userCommitted'; itemId: string }
  | { kind: 'userTranscript'; itemId: string; text: string }
  | { kind: 'userTranscriptFailed'; itemId: string }
  | { kind: 'assistantTranscript'; responseId: string; text: string }
  | { kind: 'assistantDelta'; text: string }
  | { kind: 'assistantStarted'; responseId: string }
  | { kind: 'responseDone'; usage?: RealtimeUsage; responseId?: string }
  
  
  
  
  | { kind: 'audioStarted' } 
  | { kind: 'audioStopped' } 
  | { kind: 'error'; message: string }
  | { kind: 'ignore' }


export function parseRealtimeEvent(raw: string): VoiceAction {
  let e: Record<string, unknown>
  try {
    e = JSON.parse(raw)
  } catch {
    return { kind: 'ignore' }
  }
  switch (e.type) {
    case 'response.function_call_arguments.done': {
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(String(e.arguments ?? '{}')) } catch { args = {} }
      return { kind: 'toolCall', callId: String(e.call_id), name: String(e.name), args }
    }
    
    
    case 'input_audio_buffer.committed':
      return { kind: 'userCommitted', itemId: String(e.item_id ?? '') }
    case 'conversation.item.input_audio_transcription.completed':
      return { kind: 'userTranscript', itemId: String(e.item_id ?? ''), text: String(e.transcript ?? '') }
    case 'conversation.item.input_audio_transcription.failed':
      return { kind: 'userTranscriptFailed', itemId: String(e.item_id ?? '') }
    case 'response.output_audio_transcript.delta':
      return { kind: 'assistantDelta', text: String(e.delta ?? '') }
    case 'response.output_audio_transcript.done':
      return {
        kind: 'assistantTranscript',
        responseId: String(e.response_id ?? ''),
        text: String(e.transcript ?? ''),
      }
    case 'response.created':
      return { kind: 'assistantStarted', responseId: String((e.response as { id?: string } | undefined)?.id ?? '') }
    case 'output_audio_buffer.started':
      return { kind: 'audioStarted' }
    case 'output_audio_buffer.stopped':
    case 'output_audio_buffer.cleared':
      return { kind: 'audioStopped' }
    case 'response.done': {
      
      
      const resp = e.response as { usage?: RealtimeUsage; id?: string } | undefined
      return { kind: 'responseDone', usage: resp?.usage, responseId: resp?.id }
    }
    case 'error':
      return { kind: 'error', message: String((e.error as { message?: string })?.message ?? 'erro') }
    default:
      return { kind: 'ignore' }
  }
}


export function bargeInEvents(s: { responseActive: boolean; audioPlaying: boolean }) {
  const events: Array<{ type: 'response.cancel' } | { type: 'output_audio_buffer.clear' }> = []
  if (s.responseActive) events.push({ type: 'response.cancel' })
  if (s.audioPlaying) events.push({ type: 'output_audio_buffer.clear' })
  return events
}

export function usageToCostPayload(usage: RealtimeUsage, model: string) {
  return { usage, model }
}


export type PttPhase = 'idle' | 'listening' | 'committing' | 'speaking' | 'searching'
export interface PttState {
  phase: PttPhase
  interrupted?: boolean
}
export type PttEvent =
  | { type: 'press' }
  | { type: 'release' }
  | { type: 'assistantStarted' }
  | { type: 'assistantDone' }
  | { type: 'toolStarted' }

export function pttReducer(state: PttState, ev: PttEvent): PttState {
  switch (ev.type) {
    case 'press':
      
      return { phase: 'listening', interrupted: state.phase === 'speaking' }
    case 'release':
      return state.phase === 'listening' ? { phase: 'committing' } : state
    case 'assistantStarted':
      
      return { phase: 'speaking' }
    case 'toolStarted':
      
      
      
      return state.phase === 'speaking' || state.phase === 'committing' || state.phase === 'searching'
        ? { phase: 'searching' }
        : state
    case 'assistantDone':
      
      
      
      return state.phase === 'speaking' || state.phase === 'committing' || state.phase === 'searching'
        ? { phase: 'idle' }
        : state
    default:
      return state
  }
}


export function canStartTalk(phase: PttPhase): boolean {
  return phase !== 'committing' && phase !== 'searching'
}
