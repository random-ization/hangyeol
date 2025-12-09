import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dailyPhrases = [
    // Greetings & Daily
    { dayIndex: 1, korean: '좋은 하루 되세요!', romanization: 'Jo-eun ha-ru doe-se-yo!', chinese: '祝你度过美好的一天！', english: 'Have a nice day!' },
    { dayIndex: 2, korean: '안녕하세요', romanization: 'An-nyeong-ha-se-yo', chinese: '你好', english: 'Hello' },
    { dayIndex: 3, korean: '반갑습니다', romanization: 'Ban-gap-sum-ni-da', chinese: '很高兴见到你', english: 'Nice to meet you' },
    { dayIndex: 4, korean: '잘 지냈어요?', romanization: 'Jal ji-naess-eo-yo?', chinese: '你过得好吗？', english: 'How have you been?' },
    { dayIndex: 5, korean: '안녕히 주무세요', romanization: 'An-nyeong-hi ju-mu-se-yo', chinese: '晚安', english: 'Good night' },

    // Appreciation & Encouragement
    { dayIndex: 6, korean: '감사합니다', romanization: 'Gam-sa-ham-ni-da', chinese: '谢谢', english: 'Thank you' },
    { dayIndex: 7, korean: '화이팅!', romanization: 'Hwa-i-ting!', chinese: '加油！', english: 'Fighting!' },
    { dayIndex: 8, korean: '수고하셨습니다', romanization: 'Su-go-ha-syeoss-eum-ni-da', chinese: '辛苦了', english: 'Good job/Thank you for your hard work' },
    { dayIndex: 9, korean: '고맙습니다', romanization: 'Go-map-sum-ni-da', chinese: '谢谢（非正式）', english: 'Thanks' },
    { dayIndex: 10, korean: '최선을 다하세요', romanization: 'Choe-seon-eul da-ha-se-yo', chinese: '尽力而为', english: 'Do your best' },

    // Learning & Study
    { dayIndex: 11, korean: '한국어 공부 파이팅!', romanization: 'Han-guk-eo gong-bu pa-i-ting!', chinese: '韩语学习加油！', english: 'Fighting for Korean study!' },
    { dayIndex: 12, korean: '열심히 공부하세요', romanization: 'Yeol-sim-hi gong-bu-ha-se-yo', chinese: '好好学习', english: 'Study hard' },
    { dayIndex: 13, korean: '꾸준히 하면 됩니다', romanization: 'Kku-jun-hi ha-myeon doem-ni-da', chinese: '坚持就能做到', english: 'You can do it if you persist' },
    { dayIndex: 14, korean: '노력은 배신하지 않아요', romanization: 'No-ryeok-eun bae-sin-ha-ji an-a-yo', chinese: '努力不会背叛你', english: 'Hard work never betrays' },
    { dayIndex: 15, korean: '천천히 해도 괜찮아요', romanization: 'Cheon-cheon-hi hae-do gwaen-chan-a-yo', chinese: '慢慢来也没关系', english: 'It\'s okay to take it slow' },

    // Daily Life
    { dayIndex: 16, korean: '맛있게 드세요', romanization: 'Ma-sit-ge deu-se-yo', chinese: '请慢用', english: 'Enjoy your meal' },
    { dayIndex: 17, korean: '오늘 날씨가 좋네요', romanization: 'O-neul nal-ssi-ga jo-ne-yo', chinese: '今天天气真好', english: 'The weather is nice today' },
    { dayIndex: 18, korean: '조심히 가세요', romanization: 'Jo-sim-hi ga-se-yo', chinese: '小心走路/一路平安', english: 'Be careful/Take care' },
    { dayIndex: 19, korean: '건강하세요', romanization: 'Geon-gang-ha-se-yo', chinese: '保重身体', english: 'Stay healthy' },
    { dayIndex: 20, korean: '행복하세요', romanization: 'Haeng-bok-ha-se-yo', chinese: '祝你幸福', english: 'Be happy' },

    // Questions & Expressions
    { dayIndex: 21, korean: '괜찮아요?', romanization: 'Gwaen-chan-a-yo?', chinese: '还好吗？/没事吧？', english: 'Are you okay?' },
    { dayIndex: 22, korean: '이해했어요?', romanization: 'I-hae-haess-eo-yo?', chinese: '理解了吗？', english: 'Did you understand?' },
    { dayIndex: 23, korean: '죄송합니다', romanization: 'Joe-song-ham-ni-da', chinese: '对不起', english: 'I\'m sorry' },
    { dayIndex: 24, korean: '실례합니다', romanization: 'Sil-lye-ham-ni-da', chinese: '打扰了/不好意思', english: 'Excuse me' },
    { dayIndex: 25, korean: '괜찮습니다', romanization: 'Gwaen-chan-sum-ni-da', chinese: '没关系', english: 'It\'s okay' },

    // Motivational
    { dayIndex: 26, korean: '할 수 있어요!', romanization: 'Hal su iss-eo-yo!', chinese: '你能做到！', english: 'You can do it!' },
    { dayIndex: 27, korean: '포기하지 마세요', romanization: 'Po-gi-ha-ji ma-se-yo', chinese: '不要放弃', english: 'Don\'t give up' },
    { dayIndex: 28, korean: '오늘도 힘내세요', romanization: 'O-neul-do him-nae-se-yo', chinese: '今天也要加油', english: 'Keep it up today too' },
    { dayIndex: 29, korean: '잘하고 있어요', romanization: 'Jal-ha-go iss-eo-yo', chinese: '你做得很好', english: 'You\'re doing well' },
    { dayIndex: 30, korean: '당신은 대단해요', romanization: 'Dang-sin-eun dae-dan-hae-yo', chinese: '你很棒', english: 'You\'re amazing' },

    // More Daily Phrases
    { dayIndex: 31, korean: '좋은 아침이에요', romanization: 'Jo-eun a-chim-i-e-yo', chinese: '早上好', english: 'Good morning' },
    { dayIndex: 32, korean: '다녀오겠습니다', romanization: 'Da-nyeo-o-gess-eum-ni-da', chinese: '我出门了', english: 'I\'m leaving (said when leaving home)' },
    { dayIndex: 33, korean: '다녀왔습니다', romanization: 'Da-nyeo-wass-eum-ni-da', chinese: '我回来了', english: 'I\'m back' },
    { dayIndex: 34, korean: '잘 먹겠습니다', romanization: 'Jal meok-gess-eum-ni-da', chinese: '我要开动了', english: 'I will enjoy this meal' },
    { dayIndex: 35, korean: '잘 먹었습니다', romanization: 'Jal meog-eoss-eum-ni-da', chinese: '我吃好了', english: 'I enjoyed the meal' },

    // Weather & Seasons
    { dayIndex: 36, korean: '비가 와요', romanization: 'Bi-ga wa-yo', chinese: '下雨了', english: 'It\'s raining' },
    { dayIndex: 37, korean: '눈이 와요', romanization: 'Nun-i wa-yo', chinese: '下雪了', english: 'It\'s snowing' },
    { dayIndex: 38, korean: '바람이 불어요', romanization: 'Ba-ram-i bul-eo-yo', chinese: '刮风了', english: 'It\'s windy' },
    { dayIndex: 39, korean: '따뜻한 봄이 왔어요', romanization: 'Tta-tteu-tan bom-i wass-eo-yo', chinese: '温暖的春天来了', english: 'Warm spring has come' },
    { dayIndex: 40, korean: '시원한 가을이에요', romanization: 'Si-won-han ga-eul-i-e-yo', chinese: '凉爽的秋天', english: 'It\'s cool autumn' },

    // Emotions & Feelings
    { dayIndex: 41, korean: '기분이 좋아요', romanization: 'Gi-bun-i jo-a-yo', chinese: '心情很好', english: 'I feel good' },
    { dayIndex: 42, korean: '행복해요', romanization: 'Haeng-bok-hae-yo', chinese: '很幸福', english: 'I\'m happy' },
    { dayIndex: 43, korean: '사랑해요', romanization: 'Sa-rang-hae-yo', chinese: '我爱你', english: 'I love you' },
    { dayIndex: 44, korean: '보고 싶어요', romanization: 'Bo-go sip-eo-yo', chinese: '想你', english: 'I miss you' },
    { dayIndex: 45, korean: '걱정하지 마세요', romanization: 'Geok-jeong-ha-ji ma-se-yo', chinese: '不要担心', english: 'Don\'t worry' },

    // Time & Future
    { dayIndex: 46, korean: '시간 가는 게 빠르네요', romanization: 'Si-gan ga-neun ge ppa-reu-ne-yo', chinese: '时间过得真快', english: 'Time flies' },
    { dayIndex: 47, korean: '내일 봐요', romanization: 'Nae-il bwa-yo', chinese: '明天见', english: 'See you tomorrow' },
    { dayIndex: 48, korean: '다음 주에 만나요', romanization: 'Da-eum ju-e man-na-yo', chinese: '下周见', english: 'See you next week' },
    { dayIndex: 49, korean: '곧 만나요', romanization: 'Got man-na-yo', chinese: '很快见面', english: 'See you soon' },
    { dayIndex: 50, korean: '언제든지 연락하세요', romanization: 'Eon-je-deun-ji yeon-rak-ha-se-yo', chinese: '随时联系我', english: 'Contact me anytime' },

    // More Learning & Wisdom
    { dayIndex: 51, korean: '실수는 배움의 기회예요', romanization: 'Sil-su-neun bae-um-ui gi-hoe-ye-yo', chinese: '错误是学习的机会', english: 'Mistakes are learning opportunities' },
    { dayIndex: 52, korean: '모든 시작은 작아요', romanization: 'Mo-deun si-jak-eun jag-a-yo', chinese: '万事开头小', english: 'Every beginning is small' },
    { dayIndex: 53, korean: '꿈을 가지세요', romanization: 'Kkum-eul ga-ji-se-yo', chinese: '要有梦想', english: 'Have a dream' },
    { dayIndex: 54, korean: '지금이 가장 중요해요', romanization: 'Ji-geum-i ga-jang jung-yo-hae-yo', chinese: '现在最重要', english: 'Now is the most important' },
    { dayIndex: 55, korean: '작은 성공도 축하하세요', romanization: 'Jak-eun seong-gong-do chuk-ha-ha-se-yo', chinese: '小成功也要庆祝', english: 'Celebrate small successes too' },

    // Additional Common Phrases
    { dayIndex: 56, korean: '천천히 말씀해 주세요', romanization: 'Cheon-cheon-hi mal-sseum-hae ju-se-yo', chinese: '请慢慢说', english: 'Please speak slowly' },
    { dayIndex: 57, korean: '다시 한번 말씀해 주세요', romanization: 'Da-si han-beon mal-sseum-hae ju-se-yo', chinese: '请再说一遍', english: 'Please say it again' },
    { dayIndex: 58, korean: '도와주셔서 감사합니다', romanization: 'Do-wa-ju-syeo-seo gam-sa-ham-ni-da', chinese: '谢谢你的帮助', english: 'Thank you for your help' },
    { dayIndex: 59, korean: '무슨 뜻이에요?', romanization: 'Mu-seun tteus-i-e-yo?', chinese: '什么意思？', english: 'What does it mean?' },
    { dayIndex: 60, korean: '잘 부탁드립니다', romanization: 'Jal bu-tak-deu-rim-ni-da', chinese: '请多关照', english: 'Please take care of me' },
];

async function main() {
    console.log('🌱 开始填充每日一句数据...');

    for (const phrase of dailyPhrases) {
        await prisma.dailyPhrase.upsert({
            where: { dayIndex: phrase.dayIndex },
            update: phrase,
            create: phrase,
        });
    }

    console.log(`✅ 已创建/更新 ${dailyPhrases.length} 条每日一句数据`);
}

main()
    .catch((e) => {
        console.error('❌ 错误:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
