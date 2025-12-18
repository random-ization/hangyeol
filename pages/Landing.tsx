import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, GraduationCap, Headphones, Brain, ArrowRight,
    CheckCircle2, Globe, PlayCircle, Star, Users, Zap
} from 'lucide-react';
import { Language } from '../types';

interface LandingProps {
    language: Language;
}

const Landing: React.FC<LandingProps> = ({ language }) => {
    const navigate = useNavigate();

    // 滚动显现动画 Hook
    const useScrollReveal = () => {
        useEffect(() => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                        entry.target.classList.remove('opacity-0', 'translate-y-10');
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
            return () => observer.disconnect();
        }, []);
    };

    useScrollReveal();

    return (
        <div className="flex flex-col min-h-screen font-sans bg-slate-50 overflow-x-hidden selection:bg-indigo-500 selection:text-white">

            {/* --- Navbar --- */}
            <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <img src="/logo.jpg" alt="读韩" className="w-8 h-8 rounded-lg shadow-lg" />
                            <span className="font-bold text-xl text-slate-900 tracking-tight">读韩</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">登录</button>
                            <button onClick={() => navigate('/register')} className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-all hover:shadow-lg transform hover:-translate-y-0.5">
                                开始学习
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Animated Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-indigo-100 backdrop-blur-sm mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-sm font-medium text-indigo-900">延世·西江·首尔大 教材库同步更新中</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1] animate-fade-in-up animation-delay-100">
                        把韩国名校语学院<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            装进口袋里
                        </span>
                    </h1>

                    <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
                        无论你是正在备战留学的自学者，还是需要课后巩固的在校生。<br className="hidden md:block" />
                        <b>读韩 (DuHan)</b> 助你无缝衔接语学院课程，轻松应对全韩语教学环境。
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            免费试学教材
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <PlayCircle className="w-5 h-5 text-indigo-500" />
                            了解课程体系
                        </button>
                    </div>

                    {/* Social Proof / Stats */}
                    <div className="mt-16 pt-8 border-t border-slate-200/60 flex flex-wrap justify-center gap-8 md:gap-16 opacity-0 translate-y-10 reveal-on-scroll transition-all duration-700">
                        {[
                            { label: '名校教材收录', value: '20+' },
                            { label: 'TOPIK 6级通过率', value: 'High' },
                            { label: '语学院学员推荐', value: '98%' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Scrolling Marquee (Universities/Methods) --- */}
            <div className="bg-slate-900 py-6 overflow-hidden">
                <div className="flex gap-12 animate-scroll whitespace-nowrap text-slate-400 font-bold text-sm tracking-widest uppercase items-center">
                    {/* Duplicate list for infinite scroll effect */}
                    {[...Array(2)].map((_, i) => (
                        <React.Fragment key={i}>
                            <span>Yonsei University (延世)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Sogang University (西江)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Ewha Womans University (梨花)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Seoul National University (首尔大)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Kyung Hee University (庆熙)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>TOPIK I & II</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* --- Bento Grid Features --- */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 opacity-0 translate-y-10 reveal-on-scroll transition-all duration-700">
                        <h2 className="text-base font-bold text-indigo-600 uppercase tracking-wide mb-2">学习助力</h2>
                        <p className="text-3xl md:text-4xl font-bold text-slate-900">不仅是教材，更是你的智能助教</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Big Card - Curriculum */}
                        <div className="md:col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl hover:shadow-indigo-100/50 group overflow-hidden relative opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-100">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">名校语学院同步课程</h3>
                                <p className="text-slate-500 max-w-md">
                                    从延世大学的严谨语法体系，到西江大学的口语强化训练。我们数字化了顶级语学院的核心教材，让您即使不在韩国，也能紧跟课堂进度，体验最正统的韩语教育。
                                </p>
                            </div>
                            {/* Abstract UI Mockup */}
                            <div className="absolute right-0 bottom-0 w-1/2 h-4/5 bg-white rounded-tl-3xl border-t border-l border-slate-200 shadow-lg translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
                                <div className="p-4 space-y-3">
                                    <div className="h-2 w-1/3 bg-slate-100 rounded"></div>
                                    <div className="h-8 w-3/4 bg-indigo-50 rounded-lg"></div>
                                    <div className="h-8 w-full bg-white border border-slate-100 rounded-lg"></div>
                                    <div className="h-8 w-5/6 bg-white border border-slate-100 rounded-lg"></div>
                                </div>
                            </div>
                        </div>

                        {/* Tall Card - TOPIK */}
                        <div className="md:row-span-2 bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-200">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6">
                                    <GraduationCap className="w-6 h-6 text-indigo-300" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">TOPIK 考级神助攻</h3>
                                <p className="text-slate-400 mb-8">语学院的尽头是 TOPIK。我们提供历年真题模拟与智能错题分析，助你轻松拿下 6 级，申请名校奖学金。</p>

                                <div className="mt-auto space-y-3">
                                    {['全真模拟考场', '自动评分系统', '名校奖学金标准', '历年真题库'].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <span className="text-sm font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Small Card - Listening */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-300">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                                <Headphones className="w-6 h-6 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">原声听力磨耳朵</h3>
                            <p className="text-sm text-slate-500">
                                语学院课堂原声重现，支持逐句精听与倍速播放，提前适应全韩语教学环境。
                            </p>
                        </div>

                        {/* Small Card - Vocabulary */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-400">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                                <Brain className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">自学进度管家</h3>
                            <p className="text-sm text-slate-500">
                                自动记录学习轨迹，科学规划复习。无论是自学党还是留学生，都能高效管理进度。
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Steps Section --- */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/2 opacity-0 translate-x-[-20px] reveal-on-scroll duration-700">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">三步开启学霸模式</h2>
                            <div className="space-y-8">
                                {[
                                    { title: '选择目标教材', desc: '根据你所在的语学院或自学目标，选择延世、西江等对应教材。', icon: Globe },
                                    { title: '同步跟读与练习', desc: '课前预习单词，课后利用 AI 辅助巩固语法与听力。', icon: Zap },
                                    { title: '无缝对接韩国课堂', desc: '告别听不懂、跟不上的困扰，自信参与课堂互动。', icon: Star },
                                ].map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold relative z-10 ring-4 ring-indigo-50">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h4>
                                            <p className="text-slate-500">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 relative opacity-0 translate-x-[20px] reveal-on-scroll duration-700 delay-200">
                            {/* Decorative Mockup */}
                            <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-32 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center">
                                            <BookOpen className="text-indigo-200 w-12 h-12" />
                                        </div>
                                        <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center">
                                            <GraduationCap className="text-slate-300 w-12 h-12" />
                                        </div>
                                    </div>
                                    <div className="h-24 bg-slate-50 rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900 z-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center reveal-on-scroll">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">准备好开启留学/自学之旅了吗？</h2>
                    <p className="text-xl text-indigo-200 mb-12 max-w-2xl mx-auto">
                        读韩 (DuHan) 陪伴你从四十音到精通的每一步。现在加入，体验最地道的韩语教学资源。
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate('/register')}
                            className="px-10 py-5 bg-white text-indigo-900 rounded-full font-bold text-xl hover:bg-indigo-50 transition-all hover:scale-105 shadow-2xl shadow-indigo-900/50"
                        >
                            免费注册账号
                        </button>
                    </div>
                    <p className="mt-8 text-sm text-indigo-300">无需信用卡 · 免费版永久有效</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo.jpg" alt="读韩" className="w-8 h-8 rounded-lg" />
                        <span className="font-bold text-slate-900">读韩</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} DuHan Learning. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-slate-600">
                        <a href="#" className="hover:text-indigo-600">隐私政策</a>
                        <a href="#" className="hover:text-indigo-600">服务条款</a>
                        <a href="/refund" className="hover:text-indigo-600">退款政策</a>
                        <a href="#" className="hover:text-indigo-600">联系我们</a>
                    </div>
                </div>
            </footer>

            {/* --- Styles for Animations (Same as before) --- */}
            <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
      `}</style>
        </div>
    );
};

export default Landing;
