export interface iDarwinVoice {
    "Language": string;
    "VoiceName": string;
}
export default function parseVoicesDarwin(voices: Array<string>): Array<iESpeakVoice>;
