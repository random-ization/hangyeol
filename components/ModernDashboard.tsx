import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import DailyPhrase from './DailyPhrase';
import {
    Play, Calendar, TrendingUp, BookOpen,
    Target, Clock, ArrowRight,
    Flame, CheckCircle2, ChevronRight, BarChart3,
    Headphones, Settings, X
} from 'lucide-react';

// TOPIK 考试日期表 (2026年)
const TOPIK_EXAMS = [
    { round: 104, type: 'PBT', date: new Date('2026-01-11'), location: '국내' },
    { round: 11, type: 'IBT', date: new Date('2026-02-28'), location: '국내' },
    { round: 12, type: 'IBT', date: new Date('2026-03-21'), location: '국내·외' },
    { round: 105, type: 'PBT', date: new Date('2026-04-12'), location: '국내·외' },
    { round: 106, type: 'PBT', date: new Date('2026-05-17'), location: '국내·외' },
    { round: 13, type: 'IBT', date: new Date('2026-06-13'), location: '국내·외' },
    { round: 107, type: 'PBT', date: new Date('2026-07-05'), location: '국내·외' },
    { round: 14, type: 'IBT', date: new Date('2026-09-12'), location: '국내·외' },
    { round: 108, type: 'PBT', date: new Date('2026-10-18'), location: '국내·외' },
    { round: 15, type: 'IBT', date: new Date('2026-10-24'), location: '국내·외' },
    { round: 109, type: 'PBT', date: new Date('2026-11-15'), location: '국내·외' },
    { round: 16, type: 'IBT', date: new Date('2026-11-28'), location: '국내·외' },
];

// 默认每日目标
const DEFAULT_DAILY_GOALS = {
    words: 20,
    readings: 2,
    listenings: 2,
};

interface DailyGoalProgress {
    words: { target: number; completed: number };
    readings: { target: number; completed: number };
    listenings: { target: number; completed: number };
}

interface LearningStats {
    streak: number;
    weeklyMinutes: number[];
    todayActivities: {
        wordsLearned: number;
        readingsCompleted: number;
        listeningsCompleted: number;
    };
}

const ModernDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, language } = useAuth();
    const { selectedInstitute } = useLearning();
    const { institutes } = useData();

    // 每日目标设置
    const [dailyGoals, setDailyGoals] = useState(() => {
        const saved = localStorage.getItem('dailyGoals');
        return saved ? JSON.parse(saved) : DEFAULT_DAILY_GOALS;
    });
    const [showGoalSettings, setShowGoalSettings] = useState(false);

    // 学习统计数据
    const [stats, setStats] = useState<LearningStats>({
        streak: 0,
        weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
        todayActivities: { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
    });
    const [loading, setLoading] = useState(true);

    // 获取学习统计
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 获取连胜天数和本周学习时长
                const response = await api.getUserStats();
                if (response) {
                    setStats({
                        streak: response.streak || 0,
                        weeklyMinutes: response.weeklyMinutes || [0, 0, 0, 0, 0, 0, 0],
                        todayActivities: response.todayActivities || { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
                    });
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    // 保存目标设置到 localStorage
    const saveGoals = (newGoals: typeof dailyGoals) => {
        setDailyGoals(newGoals);
        localStorage.setItem('dailyGoals', JSON.stringify(newGoals));
        setShowGoalSettings(false);
    };

    // 计算下一场 TOPIK 考试
    const nextExam = useMemo(() => {
        const now = new Date();
        const upcoming = TOPIK_EXAMS.filter(exam => exam.date > now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (upcoming.length === 0) return null;

        const exam = upcoming[0];
        const daysLeft = Math.ceil((exam.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            round: exam.round,
            type: exam.type,
            date: exam.date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            daysLeft,
        };
    }, []);

    // 获取上次学习的课程信息
    const lastCourse = useMemo(() => {
        if (!user?.lastInstitute) return null;

        const institute = institutes.find(i => i.id === user.lastInstitute);
        if (!institute) return null;

        return {
            title: institute.name,
            displayLevel: institute.displayLevel,
            volume: institute.volume,
            unit: `第 ${user.lastUnit || 1} 课`,
            progress: 45, // 固定值，后续可扩展
            coverUrl: institute.coverUrl,
            themeColor: institute.themeColor || '#3B82F6',
            instituteId: institute.id,
            level: user.lastLevel || 1,
            unitNum: user.lastUnit || 1,
        };
    }, [user, institutes]);

    // 每日目标进度
    const goalProgress: DailyGoalProgress = {
        words: { target: dailyGoals.words, completed: stats.todayActivities.wordsLearned },
        readings: { target: dailyGoals.readings, completed: stats.todayActivities.readingsCompleted },
        listenings: { target: dailyGoals.listenings, completed: stats.todayActivities.listeningsCompleted },
    };

    const completedGoals = [
        goalProgress.words.completed >= goalProgress.words.target,
        goalProgress.readings.completed >= goalProgress.readings.target,
        goalProgress.listenings.completed >= goalProgress.listenings.target,
    ].filter(Boolean).length;

    // 计算本周最大学习时长（用于图表高度）
    const maxMinutes = Math.max(...stats.weeklyMinutes, 1);

    const userName = user?.name || '学习者';
    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return '早安';
        if (hour < 18) return '下午好';
        return '晚上好';
    })();

    if (!user) {
        return (
            <div className="p-8 text-center text-gray-500">
                请先登录以查看仪表盘
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* 1. 顶部欢迎与状态栏 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {greeting}，{userName} 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        距离下一场 <span className="font-bold text-indigo-600">TOPIK 考试</span> 还有 {nextExam?.daysLeft || '--'} 天，今天也要加油！
                    </p>
                </div>

                {/* 连胜状态卡片 */}
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Flame className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase">连胜挑战</div>
                            <div className="font-bold text-slate-800">{stats.streak} 天</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. 左侧主区域 (2/3 宽度) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* A. "继续学习" 英雄卡片 */}
                    {lastCourse ? (
                        <div
                            onClick={() => navigate(`/course/${lastCourse.instituteId}/${lastCourse.level}/${lastCourse.unitNum}`)}
                            className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden group cursor-pointer shadow-xl shadow-slate-200"
                        >
                            {/* 背景装饰 */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />

                            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                {/* 书本封面 */}
                                <div
                                    className="w-24 h-32 md:w-32 md:h-40 rounded-lg shadow-2xl flex-shrink-0 relative transform group-hover:-translate-y-2 transition-transform duration-300 overflow-hidden"
                                    style={{ backgroundColor: lastCourse.themeColor }}
                                >
                                    {lastCourse.coverUrl ? (
                                        <img src={lastCourse.coverUrl} alt={lastCourse.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/20" />
                                            <div className="absolute inset-0 flex items-center justify-center text-center p-2 font-bold opacity-90 text-white text-sm">
                                                {lastCourse.title}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 border border-white/10">
                                        <BookOpen className="w-3 h-3" />
                                        上次学到
                                    </div>
                                    <h2 className="text-2xl font-bold mb-1">{lastCourse.title}</h2>
                                    {(lastCourse.displayLevel || lastCourse.volume) && (
                                        <p className="text-slate-300 text-sm mb-2">
                                            {lastCourse.displayLevel}{lastCourse.displayLevel && lastCourse.volume ? ' · ' : ''}{lastCourse.volume}
                                        </p>
                                    )}
                                    <p className="text-slate-400 text-sm mb-4">{lastCourse.unit}</p>

                                    <div className="flex items-center gap-4 max-w-md mx-auto md:mx-0">
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${lastCourse.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono">{lastCourse.progress}%</span>
                                    </div>

                                    <div className="mt-6">
                                        <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 mx-auto md:mx-0">
                                            <Play className="w-4 h-4 fill-current" />
                                            继续学习
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => navigate('/courses')}
                            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white cursor-pointer hover:shadow-xl transition-shadow"
                        >
                            <BookOpen className="w-12 h-12 mb-4 opacity-80" />
                            <h2 className="text-2xl font-bold mb-2">开始你的韩语学习之旅</h2>
                            <p className="text-white/70 mb-6">选择一本教材，开始学习吧！</p>
                            <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2">
                                浏览课程 <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* B. 核心功能入口 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Target, label: "TOPIK 模考", color: "text-rose-600 bg-rose-50", desc: "全真模拟", path: "/topik" },
                            { icon: BookOpen, label: "单词本", color: "text-amber-600 bg-amber-50", desc: "智能复习", path: "/vocabulary" },
                            { icon: Headphones, label: "听力练习", color: "text-blue-600 bg-blue-50", desc: "随时随地", path: "/listening" },
                            { icon: BarChart3, label: "错题本", color: "text-emerald-600 bg-emerald-50", desc: "查漏补缺", path: "/mistakes" },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate(item.path)}
                                className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-800">{item.label}</h3>
                                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* C. 学习统计图表 */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                本周学习时长
                            </h3>
                            <span className="text-xs text-slate-400">单位：分钟</span>
                        </div>
                        {/* 柱状图 */}
                        <div className="h-48 flex items-end justify-between gap-2">
                            {stats.weeklyMinutes.map((minutes, i) => {
                                const height = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
                                const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {minutes}分
                                        </span>
                                        <div className="w-full relative flex-1 flex items-end">
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-indigo-600' : 'bg-slate-100 group-hover:bg-indigo-200'}`}
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs ${isToday ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* 3. 右侧侧边栏 (1/3 宽度) */}
                <div className="space-y-6">

                    {/* D. 每日目标 */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">今日目标</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">
                                    {completedGoals}/3
                                </span>
                                <button
                                    onClick={() => setShowGoalSettings(true)}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { id: 'words', title: `完成 ${goalProgress.words.target} 个新单词`, progress: goalProgress.words },
                                { id: 'readings', title: `阅读 ${goalProgress.readings.target} 篇文章`, progress: goalProgress.readings },
                                { id: 'listenings', title: `听力练习 ${goalProgress.listenings.target} 篇`, progress: goalProgress.listenings },
                            ].map((goal) => {
                                const done = goal.progress.completed >= goal.progress.target;
                                return (
                                    <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                            }`}>
                                            {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <span className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                {goal.title}
                                            </span>
                                            {!done && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {goal.progress.completed}/{goal.progress.target}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* E. 考试倒计时 */}
                    {nextExam && (
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Coming Up</div>
                                    <h3 className="font-bold text-lg">
                                        TOPIK {nextExam.type} 第 {nextExam.round} 届
                                    </h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Calendar className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-bold">{nextExam.daysLeft}</span>
                                <span className="text-sm text-indigo-200">天后考试</span>
                            </div>
                            <p className="text-xs text-indigo-200/80 mb-4">
                                考试日期: {nextExam.date}
                            </p>

                            <button
                                onClick={() => navigate('/topik')}
                                className="w-full py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
                            >
                                开始备考
                            </button>
                        </div>
                    )}

                    {/* F. 每日一句 */}
                    <DailyPhrase />

                </div>
            </div>

            {/* 目标设置弹窗 */}
            {showGoalSettings && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-bold">设置每日目标</h2>
                            <button onClick={() => setShowGoalSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">每日单词数量</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={dailyGoals.words}
                                    onChange={(e) => setDailyGoals({ ...dailyGoals, words: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">每日阅读篇数</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={dailyGoals.readings}
                                    onChange={(e) => setDailyGoals({ ...dailyGoals, readings: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">每日听力篇数</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={dailyGoals.listenings}
                                    onChange={(e) => setDailyGoals({ ...dailyGoals, listenings: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => setShowGoalSettings(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => saveGoals(dailyGoals)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModernDashboard;
