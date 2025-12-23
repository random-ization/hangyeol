import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, ArrowLeft } from 'lucide-react';

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.getPodcastHistory()
            .then(setHistory)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-white p-4 sticky top-0 z-10 border-b flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">播放历史</h1>
            </div>

            <div className="p-4 space-y-3">
                {loading && (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                )}

                {!loading && history.length === 0 && (
                    <p className="text-center text-gray-400 mt-10">暂无播放记录</p>
                )}

                {history.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => navigate('/podcasts/player', {
                            state: {
                                episode: {
                                    guid: item.episodeGuid,
                                    title: item.episodeTitle,
                                    audioUrl: item.episodeUrl,
                                    channel: { title: item.channelName, image: item.channelImage }
                                }
                            }
                        })}
                        className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition hover:shadow-md"
                    >
                        <img
                            src={item.channelImage || '/placeholder-podcast.png'}
                            alt={item.channelName}
                            className="w-14 h-14 rounded-lg bg-gray-200 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 line-clamp-1">{item.episodeTitle}</h3>
                            <p className="text-xs text-slate-500 mb-1">{item.channelName}</p>
                            <div className="flex items-center text-xs text-slate-400 gap-1">
                                <Calendar size={12} />
                                {new Date(item.playedAt).toLocaleDateString('zh-CN')}
                            </div>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
                            <Play size={16} fill="currentColor" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
