import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, GraduationCap, Brain, Headphones,
    Check, Star, Zap, Layout, Mic2, FileText
} from 'lucide-react';

const CoursesOverview: React.FC = () => {
    const navigate = useNavigate();

    // 滚动动画
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-10');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100">

            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        返回首页
                    </button>
                    <span className="font-bold text-lg tracking-tight">读韩功能详解</span>
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        免费注册
                    </button>
                </div>
            </nav>

            {/* Header */}
            <header className="pt-32 pb-16 px-4 text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold mb-6">
                    <Star className="w-4 h-4 fill-current" />
                    全栈式韩语学习解决方案
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                    不仅仅是电子书，<br />
                    更是你的 <span className="text-indigo-600">AI 智能韩语私教</span>
                </h1>
                <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    读韩 (DuHan) 深度整合了韩国顶尖大学的教学体系与最先进的学习工具。
                    来看看我们如何通过四大核心模块，帮助你从零基础直达 TOPIK 6 级。
                </p>
            </header>

            {/* Feature 1: Curriculum (Text Left, Image Right) */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">大学权威教材同步</h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                我们获得了多所韩国名校语学院的教材内容授权或深度解析。无论你是计划去延世大学深造，还是喜欢西江大学的口语风格，这里都有最适合你的课程。
                            </p>
                            <ul className="space-y-4">
                                {[
                                    '涵盖延世、西江、首尔大、梨花等主流教材',
                                    '1-6级分级明确，无缝对接语学院分班考试',
                                    '每课包含核心词汇、语法详解、课文精读',
                                    '支持教材内容的一键划词翻译与笔记'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700 delay-200">
                            {/* Mockup: Course List */}
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                                            <div className="w-12 h-16 bg-slate-200 rounded-lg flex-shrink-0 mr-4 shadow-sm"></div>
                                            <div className="flex-1">
                                                <div className="h-4 w-32 bg-slate-800 rounded mb-2 opacity-80"></div>
                                                <div className="h-3 w-48 bg-slate-400 rounded opacity-40"></div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                                <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 2: TOPIK (Image Left, Text Right) */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700">
                            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                                <GraduationCap className="w-6 h-6 text-violet-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">TOPIK 实战模拟考场</h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                完全还原 TOPIK II 真实考试流程。从倒计时控制到听力播放间隔，每一个细节都为了让你适应考场节奏，不再怯场。
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <Layout className="w-6 h-6 text-violet-500 mb-2" />
                                    <h4 className="font-bold text-slate-900 mb-1">全真界面</h4>
                                    <p className="text-sm text-slate-500">还原纸质试卷排版，支持大篇幅阅读分栏显示。</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <Zap className="w-6 h-6 text-violet-500 mb-2" />
                                    <h4 className="font-bold text-slate-900 mb-1">智能评分</h4>
                                    <p className="text-sm text-slate-500">考完即出分，提供详细的做题报告与能力雷达图。</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700 delay-200">
                            {/* Mockup: Exam Paper */}
                            <div className="bg-slate-900 rounded-2xl shadow-2xl p-2 relative">
                                <div className="bg-white rounded-xl overflow-hidden h-[400px] relative flex flex-col">
                                    {/* Exam Header */}
                                    <div className="h-12 bg-slate-100 border-b flex items-center px-4 justify-between">
                                        <div className="w-20 h-4 bg-slate-300 rounded"></div>
                                        <div className="w-16 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-xs font-mono font-bold">59:20</div>
                                    </div>
                                    {/* Paper Content */}
                                    <div className="flex-1 p-6 flex gap-6">
                                        <div className="w-1/2 space-y-3 border-r pr-6 border-slate-100">
                                            <div className="w-full h-32 bg-slate-50 rounded border border-slate-100"></div>
                                            <div className="w-full h-2 bg-slate-200 rounded"></div>
                                            <div className="w-3/4 h-2 bg-slate-200 rounded"></div>
                                            <div className="w-full h-2 bg-slate-200 rounded"></div>
                                        </div>
                                        <div className="w-1/2 space-y-4">
                                            <div className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0"></div>
                                                <div className="w-3/4 h-4 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full border-4 border-indigo-500 shrink-0"></div>
                                                <div className="w-2/3 h-4 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0"></div>
                                                <div className="w-4/5 h-4 bg-slate-100 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 3 & 4: Vocab & Media (Grid) */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Vocab Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-all reveal opacity-0 translate-y-10 duration-700">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                                <Brain className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">智能生词本 & 错题集</h3>
                            <p className="text-slate-600 mb-6">
                                学习过程中遇到的生词一键加入生词本。系统会自动生成抽认卡(Flashcards)，支持"拼写模式"和"选择模式"，帮助你利用碎片时间高效记忆。
                            </p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">艾宾浩斯记忆</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">自动TTS发音</span>
                            </div>
                        </div>

                        {/* Media Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-all reveal opacity-0 translate-y-10 duration-700 delay-100">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                                <Headphones className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">沉浸式听读播放器</h3>
                            <p className="text-slate-600 mb-6">
                                告别枯燥的音频文件。我们的播放器支持交互式脚本：点击句子即可跳转音频进度，长难句一键查看翻译，支持 0.5x - 2.0x 倍速调节，练就"韩语耳"。
                            </p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">逐句精听</span>
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">双语对照</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Feature 5: Grammar (Centered) */}
            <section className="py-20 bg-white border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-4 text-center reveal opacity-0 translate-y-10 transition-all duration-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-6">
                        <FileText className="w-8 h-8 text-pink-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-6">AI 辅助语法解析</h2>
                    <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                        遇到不懂的长难句？<br />
                        读韩内置的 AI 助手可以拆解句子结构，分析语法点，并提供相关例句。<br />
                        就像身边坐着一位 24 小时在线的韩语私教。
                    </p>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-2xl mx-auto shadow-inner">
                        <div className="flex gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 mt-2"></div>
                            <div>
                                <p className="font-bold text-slate-800">...(으)ㄹ 수 있다/없다</p>
                                <p className="text-sm text-slate-500 mt-1">表示"能力"或"可能性"。相当于英语的 "can" / "cannot"。</p>
                                <p className="text-sm text-indigo-600 mt-2 bg-indigo-50 p-2 rounded">例：저는 한국어를 할 수 있어요. (我会说韩语。)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-24 bg-slate-900 text-white text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-4xl font-bold mb-6">您的韩语进阶之路，从这里开始</h2>
                    <p className="text-slate-400 text-lg mb-10">
                        加入数万名韩语学习者的行列。现在注册，即可免费体验第一单元所有功能。
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-xl transition-all hover:scale-105 shadow-2xl shadow-indigo-900/50"
                    >
                        免费创建账号
                    </button>
                    <p className="mt-6 text-sm text-slate-500">
                        已有账号？ <button onClick={() => navigate('/login')} className="text-white hover:underline underline-offset-4">立即登录</button>
                    </p>
                </div>
            </section>

        </div>
    );
};

export default CoursesOverview;
