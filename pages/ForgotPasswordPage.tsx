import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAuth();
    const labels = getLabels(language);

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSent(true);
            } else {
                setError(data.error || 'Failed to send reset email. Please try again.');
            }
        } catch (error) {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
                <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-violet-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10">

                    {!sent ? (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <Mail className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {language === 'zh' ? '忘记密码？' : 'Forgot Password?'}
                                </h1>
                                <p className="text-indigo-200 text-sm">
                                    {language === 'zh'
                                        ? '输入您的邮箱，我们将发送重置链接'
                                        : "Enter your email and we'll send you a reset link"}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-indigo-200 ml-1 uppercase tracking-wider">
                                        {labels.email || 'Email'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-indigo-500/30 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        language === 'zh' ? '发送重置链接' : 'Send Reset Link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm text-indigo-200 hover:text-white font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {language === 'zh' ? '返回登录' : 'Back to Login'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <div className="text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {language === 'zh' ? '邮件已发送！' : 'Email Sent!'}
                                </h1>
                                <p className="text-indigo-200 text-sm mb-8">
                                    {language === 'zh'
                                        ? '如果该邮箱已注册，您将收到密码重置链接。请检查您的收件箱。'
                                        : 'If an account with that email exists, you will receive a password reset link. Please check your inbox.'}
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                                >
                                    {language === 'zh' ? '返回登录' : 'Back to Login'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
