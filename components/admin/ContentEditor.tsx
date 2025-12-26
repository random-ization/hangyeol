import React, { useState } from 'react';
import { Institute, Language, LevelConfig } from '../../types';
import { getLabels } from '../../utils/i18n';
import { api } from '../../services/api';
import {
  Plus,
  Loader2,
  X,
  BookOpen,
  Trash2,
  Upload,
  Pencil,
  Image,
} from 'lucide-react';

// ============================================================
// TYPES & HELPERS
// ============================================================

interface ContentEditorProps {
  institutes: Institute[];
  language: Language;
  onAddInstitute: (name: string, levels?: LevelConfig[], options?: { coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string; totalUnits?: number }) => void | Promise<void>;
  onUpdateInstitute?: (id: string, updates: { name?: string; coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string; totalUnits?: number }) => Promise<void>;
  onDeleteInstitute?: (id: string) => void | Promise<void>;
  // Legacy props kept for compatibility
  textbookContexts?: any;
  onSaveContext?: any;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const ContentEditor: React.FC<ContentEditorProps> = ({
  institutes,
  language,
  onAddInstitute,
  onUpdateInstitute,
  onDeleteInstitute,
}) => {
  const labels = getLabels(language);

  // Add Textbook Modal
  const [showAddTextbook, setShowAddTextbook] = useState(false);
  const [newTextbookName, setNewTextbookName] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newThemeColor, setNewThemeColor] = useState('#3B82F6');
  const [newPublisher, setNewPublisher] = useState('');
  const [newDisplayLevel, setNewDisplayLevel] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [newTotalUnits, setNewTotalUnits] = useState(10);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Institute Modal
  const [showEditInstitute, setShowEditInstitute] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<Institute | null>(null);
  const [editInstituteName, setEditInstituteName] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editThemeColor, setEditThemeColor] = useState('#3B82F6');
  const [editPublisher, setEditPublisher] = useState('');
  const [editDisplayLevel, setEditDisplayLevel] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editTotalUnits, setEditTotalUnits] = useState(10);
  const [editCoverUploading, setEditCoverUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (isEdit) {
      setEditCoverUploading(true);
    } else {
      setCoverUploading(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const response = await api.uploadFile(formData);

      if (isEdit) {
        setEditCoverUrl(response.url);
      } else {
        setNewCoverUrl(response.url);
      }
    } catch (error) {
      console.error('Cover upload failed:', error);
      alert(`封面上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      if (isEdit) {
        setEditCoverUploading(false);
      } else {
        setCoverUploading(false);
      }
    }
  };

  // Add new textbook
  const handleAddTextbook = async () => {
    if (!newTextbookName.trim()) return;
    setIsAdding(true);
    try {
      await onAddInstitute(newTextbookName, [{ level: 1, units: newTotalUnits }], {
        coverUrl: newCoverUrl,
        themeColor: newThemeColor,
        publisher: newPublisher,
        displayLevel: newDisplayLevel,
        volume: newVolume,
        totalUnits: newTotalUnits,
      });
      setShowAddTextbook(false);
      setNewTextbookName('');
      setNewCoverUrl('');
      setNewThemeColor('#3B82F6');
      setNewPublisher('');
      setNewDisplayLevel('');
      setNewVolume('');
      setNewTotalUnits(10);
    } catch (error) {
      console.error('Add textbook failed:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Update textbook
  const handleUpdateInstitute = async () => {
    if (!editingInstitute || !onUpdateInstitute) return;
    setIsUpdating(true);
    try {
      await onUpdateInstitute(editingInstitute.id, {
        name: editInstituteName,
        coverUrl: editCoverUrl,
        themeColor: editThemeColor,
        publisher: editPublisher,
        displayLevel: editDisplayLevel,
        volume: editVolume,
        totalUnits: editTotalUnits,
      });
      setShowEditInstitute(false);
      setEditingInstitute(null);
    } catch (error) {
      console.error('Update institute failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================
  // RENDER: LIBRARY VIEW
  // ============================================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <h1 className="text-2xl font-bold text-gray-900">📚 教材管理</h1>
        <button
          onClick={() => setShowAddTextbook(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增教材
        </button>
      </div>

      {/* Description */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-700">
          💡 教材仅用于组织和分类。词汇、语法等内容请在各自的管理模块中添加，并选择对应教材进行绑定。
        </p>
      </div>

      {/* Institute Cards */}
      <div className="flex-1 overflow-auto p-6">
        {institutes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">暂无教材</p>
              <p className="text-sm">点击"新增教材"添加第一本教材</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {institutes.map(institute => (
              <div key={institute.id} className="group">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-gray-100 to-gray-200">
                  {institute.coverUrl ? (
                    <img
                      src={institute.coverUrl}
                      alt={institute.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: institute.themeColor || '#3B82F6' }}
                    >
                      <BookOpen className="w-16 h-16 text-white/80" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg truncate">{institute.name}</h3>
                    {(institute.displayLevel || institute.volume) && (
                      <p className="text-white/90 text-sm">
                        {institute.displayLevel}{institute.displayLevel && institute.volume ? ' · ' : ''}{institute.volume}
                      </p>
                    )}
                    {institute.publisher && (
                      <p className="text-white/60 text-xs truncate">{institute.publisher}</p>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingInstitute(institute);
                        setEditInstituteName(institute.name);
                        setEditCoverUrl(institute.coverUrl || '');
                        setEditThemeColor(institute.themeColor || '#3B82F6');
                        setEditPublisher(institute.publisher || '');
                        setEditDisplayLevel(institute.displayLevel || '');
                        setEditVolume(institute.volume || '');
                        setEditTotalUnits(institute.totalUnits || 10);
                        setShowEditInstitute(true);
                      }}
                      className="p-2 bg-white/90 rounded-full shadow hover:bg-white"
                    >
                      <Pencil className="w-4 h-4 text-gray-700" />
                    </button>
                    {onDeleteInstitute && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`确定要删除 "${institute.name}" 吗？`)) {
                            await onDeleteInstitute(institute.id);
                          }
                        }}
                        className="p-2 bg-white/90 rounded-full shadow hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Textbook Modal */}
      {showAddTextbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">新增教材</h2>
              <button onClick={() => setShowAddTextbook(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Cover Upload */}
              <div className="flex gap-4">
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {newCoverUrl ? (
                    <img src={newCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 text-gray-400">
                      {coverUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Image className="w-6 h-6" />
                          <span className="text-xs">上传封面</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoverUpload(e, false)}
                        disabled={coverUploading}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={newTextbookName}
                    onChange={(e) => setNewTextbookName(e.target.value)}
                    placeholder="教材名称 *"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={newPublisher}
                    onChange={(e) => setNewPublisher(e.target.value)}
                    placeholder="出版社"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newDisplayLevel}
                  onChange={(e) => setNewDisplayLevel(e.target.value)}
                  placeholder="级别 (如: 初级)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={newVolume}
                  onChange={(e) => setNewVolume(e.target.value)}
                  placeholder="册数 (如: 上册)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  value={newTotalUnits}
                  onChange={(e) => setNewTotalUnits(parseInt(e.target.value) || 1)}
                  min={1}
                  max={50}
                  placeholder="单元数"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Theme Color */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">主题色:</span>
                <input
                  type="color"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowAddTextbook(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAddTextbook}
                disabled={!newTextbookName.trim() || isAdding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Institute Modal */}
      {showEditInstitute && editingInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">编辑教材</h2>
              <button onClick={() => setShowEditInstitute(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Cover Upload */}
              <div className="flex gap-4">
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {editCoverUrl ? (
                    <div className="relative w-full h-full">
                      <img src={editCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCoverUpload(e, true)}
                          disabled={editCoverUploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 text-gray-400">
                      {editCoverUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Image className="w-6 h-6" />
                          <span className="text-xs">上传封面</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoverUpload(e, true)}
                        disabled={editCoverUploading}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={editInstituteName}
                    onChange={(e) => setEditInstituteName(e.target.value)}
                    placeholder="教材名称 *"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={editPublisher}
                    onChange={(e) => setEditPublisher(e.target.value)}
                    placeholder="出版社"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={editDisplayLevel}
                  onChange={(e) => setEditDisplayLevel(e.target.value)}
                  placeholder="级别 (如: 初级)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={editVolume}
                  onChange={(e) => setEditVolume(e.target.value)}
                  placeholder="册数 (如: 上册)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  value={editTotalUnits}
                  onChange={(e) => setEditTotalUnits(parseInt(e.target.value) || 1)}
                  min={1}
                  max={50}
                  placeholder="单元数"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Theme Color */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">主题色:</span>
                <input
                  type="color"
                  value={editThemeColor}
                  onChange={(e) => setEditThemeColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEditInstitute(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleUpdateInstitute}
                disabled={!editInstituteName.trim() || isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
