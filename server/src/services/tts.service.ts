import { getAudioBase64 } from 'google-tts-api';
import { sendToS3WithCache } from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';

export class TTSService {
    /**
     * Generate Korean TTS and upload to S3
     * @param text Korean text
     * @returns Public S3 URL
     */
    static async generate(text: string): Promise<string> {
        try {
            // 1. Get audio from Google TTS (High quality base64)
            const base64 = await getAudioBase64(text, {
                lang: 'ko',
                slow: false,
                host: 'https://translate.google.com',
                timeout: 10000,
            });

            // 2. Convert to buffer
            const buffer = Buffer.from(base64, 'base64');

            // 3. Upload to S3
            // Use efficient caching since TTS for a word never changes
            const key = `vocab-audio/${uuidv4()}.mp3`;
            const url = await sendToS3WithCache(key, buffer, 'audio/mpeg', 31536000); // 1 year cache

            return url;
        } catch (error) {
            console.error('TTS Generation failed:', error);
            throw new Error('Failed to generate audio');
        }
    }
}
