import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Pencil, Trash2, X, Link2, ExternalLink } from 'lucide-react';
import PageBox from '../components/PageBox';
import Modal from '../components/Modal';
import { useMsg } from '../components/Msg';

/* ==================== 类型定义 ==================== */

/** 条目类型 */
type ChannelKind = 'blogger' | 'video';

/** 一条频道记录（博主或单条视频） */
interface Channel {
  id: number;
  kind: string;
  avatar: string;
  name: string;
  account_id: string;
  homepage_url: string;
  platform: string;
  category: string;
  description: string;
  created_at: string;
}

/** 该账号下喜欢的视频 */
interface ChannelVideo {
  id: number;
  channel_id: number;
  url: string;
  title: string;
  order_index: number;
}

/** 后端返回：频道 + 其视频列表 */
type ChannelWithVideos = [Channel, ChannelVideo[]];

/** 表单状态（新增/编辑共用） */
interface ChannelForm {
  kind: ChannelKind;
  avatar: string;
  name: string;
  account_id: string;
  homepage_url: string;
  platform: string;
  category: string;
  description: string;
}

const EMPTY_FORM: ChannelForm = {
  kind: 'blogger',
  avatar: '',
  name: '',
  account_id: '',
  homepage_url: '',
  platform: '',
  category: '',
  description: '',
};

/** 平台预设，供快速填充 */
const PLATFORM_PRESETS = [
  'Bilibili',
  'YouTube',
  '小红书',
  '抖音',
  '微博',
  'Twitter',
  'Twitch',
  '知乎',
];

/** 内容题材预设，供快速填充，也可以自由输入 */
const CATEGORY_PRESETS = [
  '情感',
  '做饭',
  '美食',
  '游戏',
  '知识',
  '科技',
  '数码',
  '生活',
  '旅行',
  '影视',
  '音乐',
  '舞蹈',
  '健身',
  '宠物',
  '搞笑',
  '手工',
  '绘画',
  '穿搭',
  '美妆',
  '学习',
];

/** 未填写类别时的归类名，同时用于筛选标签 */
const UNCATEGORIZED = '未分类';

/* ==================== 打开外链 ==================== */

/**
 * 用系统默认浏览器打开链接。
 *
 * Tauri 的 WebView 里 `<a target="_blank">` 不会真正跳转，
 * 必须交给后端 `open_url` 命令走系统 ShellExecute。
 * 失败时通过 onError 回调提示（通常是协议不被支持）。
 */
const openUrl = async (
  url: string,
  onError?: (message: string) => void,
) => {
  try {
    await invoke('open_url', { url });
  } catch (err) {
    console.error('打开链接失败:', err);
    onError?.(`打开链接失败：${err}`);
  }
};

/* ==================== 主页面 ==================== */

const ChannelPage: React.FC = () => {
  const { showMsg } = useMsg();

  const [channels, setChannels] = useState<ChannelWithVideos[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 新增/编辑弹窗
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ChannelForm>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);

  // 视频管理弹窗
  const [videoTarget, setVideoTarget] = useState<Channel | null>(null);

  // 类别筛选；null 表示「全部」
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 类型筛选；null 表示「全部」
  const [activeKind, setActiveKind] = useState<ChannelKind | null>(null);

  /* ---------- 数据加载 ---------- */

  const fetchChannels = useCallback(async () => {
    try {
      const result = await invoke<ChannelWithVideos[]>('get_channels');
      setChannels(result);
      setError(null);
    } catch (err) {
      setError(String(err));
      console.error('获取频道列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  /* ---------- 新增 / 编辑 ---------- */

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (channel: Channel) => {
    setEditingId(channel.id);
    setForm({
      kind: channel.kind === 'video' ? 'video' : 'blogger',
      avatar: channel.avatar,
      name: channel.name,
      account_id: channel.account_id,
      homepage_url: channel.homepage_url,
      platform: channel.platform,
      category: channel.category,
      description: channel.description,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    // 博主需要账号名；视频需要视频名（都存在 name 字段里）
    const nameLabel = form.kind === 'video' ? '视频名' : '账号名';
    if (!form.name.trim()) {
      showMsg(`${nameLabel}不能为空`, 'error');
      return;
    }
    if (form.kind === 'video' && !form.homepage_url.trim()) {
      showMsg('视频链接不能为空', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId === null) {
        await invoke('add_channel', { channel: form });
        showMsg('频道已添加', 'success');
      } else {
        await invoke('update_channel', { id: editingId, patch: form });
        showMsg('频道已更新', 'success');
      }
      setFormOpen(false);
      await fetchChannels();
    } catch (err) {
      showMsg(`保存失败：${err}`, 'error');
      console.error('保存频道失败:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 删除 ---------- */

  const handleDelete = async (channel: Channel) => {
    if (!window.confirm(`确定删除「${channel.name}」及其所有视频记录？`)) {
      return;
    }
    try {
      await invoke('delete_channel', { id: channel.id });
      showMsg('频道已删除', 'success');
      await fetchChannels();
    } catch (err) {
      showMsg(`删除失败：${err}`, 'error');
      console.error('删除频道失败:', err);
    }
  };

  /* ---------- 类别筛选 ---------- */

  // 从已加载的数据里动态归集类别，并统计每个类别下的频道数。
  // 未填类别的频道归入「未分类」，保证不会因为空值而漏掉。
  const categoryCounts = (() => {
    const map = new Map<string, number>();
    for (const [channel] of channels) {
      // 类别标签跟随类型筛选，避免显示当前类型下不存在的类别
      if (activeKind !== null && channel.kind !== activeKind) continue;
      const key = channel.category.trim() || UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    // 名称升序，但「未分类」始终排在最后
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b, 'zh-Hans-CN');
    });
  })();

  const visibleChannels = channels.filter(([channel]) => {
    if (activeKind !== null && channel.kind !== activeKind) return false;
    if (activeCategory === null) return true;
    return (channel.category.trim() || UNCATEGORIZED) === activeCategory;
  });

  // 类型维度的数量统计（用于顶部「全部 / 博主 / 视频」标签）
  const kindCounts = {
    blogger: channels.filter(([c]) => c.kind === 'blogger').length,
    video: channels.filter(([c]) => c.kind === 'video').length,
  };

  /* ---------- 渲染 ---------- */

  return (
    <PageBox>
      <div className="p-6 max-w-[1100px] mx-auto">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="text-red-500">📺</span>
              频道
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              记录你在各个平台关注的账号，以及喜欢的视频
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer
                bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            添加频道
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-xs text-red-500">
            ⚠️ {error}
          </div>
        )}

        {/* 类型筛选：全部 / 博主 / 视频 */}
        {!loading && !error && channels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <CategoryTab
              label="全部"
              count={channels.length}
              active={activeKind === null}
              onClick={() => setActiveKind(null)}
            />
            <CategoryTab
              label="博主"
              count={kindCounts.blogger}
              active={activeKind === 'blogger'}
              onClick={() => setActiveKind('blogger')}
            />
            <CategoryTab
              label="视频"
              count={kindCounts.video}
              active={activeKind === 'video'}
              onClick={() => setActiveKind('video')}
            />
          </div>
        )}

        {/* 类别筛选标签 */}
        {!loading && !error && channels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <CategoryTab
              label="全部类别"
              count={
                categoryCounts.reduce((sum, [, count]) => sum + count, 0)
              }
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categoryCounts.map(([category, count]) => (
              <CategoryTab
                key={category}
                label={category}
                count={count}
                active={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
          </div>
        )}

        {/* 列表 */}
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500">加载中…</div>
        ) : channels.length === 0 ? (
          <div className="text-center py-16 px-5 bg-neutral-900/60 rounded-2xl border border-red-500/20">
            <span className="text-4xl block mb-3 opacity-50">📺</span>
            <p className="text-sm text-gray-400">还没有关注的频道</p>
            <p className="text-xs text-gray-500 mt-1">
              点击右上角「添加频道」开始记录
            </p>
          </div>
        ) : visibleChannels.length === 0 ? (
          <div className="text-center py-16 px-5 bg-neutral-900/60 rounded-2xl border border-red-500/20">
            <span className="text-4xl block mb-3 opacity-50">🔍</span>
            <p className="text-sm text-gray-400">
              该类别下暂无频道
            </p>
            <button
              onClick={() => setActiveCategory(null)}
              className="mt-3 px-3.5 py-1.5 text-xs rounded-md bg-gray-700/70 text-gray-300
                  cursor-pointer border-none hover:bg-red-500 hover:text-white transition-colors"
            >
              显示全部
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleChannels.map(([channel, videos]) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                videos={videos}
                onEdit={() => openEdit(channel)}
                onDelete={() => handleDelete(channel)}
                onManageVideos={() => setVideoTarget(channel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <ChannelFormModal
        isOpen={formOpen}
        isEditing={editingId !== null}
        saving={saving}
        form={form}
        onChange={setForm}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      {/* 视频管理弹窗 */}
      <VideoManagerModal
        channel={videoTarget}
        videos={
          videoTarget
            ? (channels.find(([c]) => c.id === videoTarget.id)?.[1] ?? [])
            : []
        }
        onClose={() => setVideoTarget(null)}
        onChanged={fetchChannels}
      />
    </PageBox>
  );
};

/* ==================== 类别标签 ==================== */

const CategoryTab: React.FC<{
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full cursor-pointer
        border transition-colors ${
          active
            ? 'bg-red-500 border-red-500 text-white'
            : 'bg-neutral-900/80 border-red-500/20 text-gray-300 hover:border-red-500/50 hover:text-white'
        }`}
  >
    <span>{label}</span>
    <span
      className={`text-[0.625rem] px-1.5 rounded-full ${
        active ? 'bg-white/25 text-white' : 'bg-gray-700/70 text-gray-400'
      }`}
    >
      {count}
    </span>
  </button>
);

/* ==================== 频道卡片 ==================== */

const ChannelCard: React.FC<{
  channel: Channel;
  videos: ChannelVideo[];
  onEdit: () => void;
  onDelete: () => void;
  onManageVideos: () => void;
}> = ({ channel, videos, onEdit, onDelete, onManageVideos }) => {
  // 头像可能是本地路径或 URL；两者都加载失败时回退到首字母
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatar = channel.avatar.trim() !== '' && !avatarBroken;

  const isVideo = channel.kind === 'video';

  return (
    <div className="flex gap-4 p-4 bg-neutral-900/80 rounded-xl border border-red-500/15 hover:border-red-500/30 transition-colors">
      {/* 头像 */}
      <div className="shrink-0">
        {showAvatar ? (
          <img
            src={channel.avatar}
            alt={channel.name}
            onError={() => setAvatarBroken(true)}
            className={`w-14 h-14 object-cover border border-red-500/30 ${
              isVideo ? 'rounded-lg' : 'rounded-full'
            }`}
          />
        ) : (
          <div
            className={`w-14 h-14 bg-red-500/20 border border-red-500/30 flex items-center justify-center text-lg text-red-400 ${
              isVideo ? 'rounded-lg' : 'rounded-full'
            }`}
          >
            {isVideo ? '🎬' : channel.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* 主体信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{channel.name}</span>
          <span
            className={`px-2 py-0.5 text-[0.625rem] rounded ${
              isVideo
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isVideo ? '视频' : '博主'}
          </span>
          {channel.platform && (
            <span className="px-2 py-0.5 text-[0.625rem] rounded bg-gray-700/70 text-gray-300">
              {channel.platform}
            </span>
          )}
          {channel.category && (
            <span className="px-2 py-0.5 text-[0.625rem] rounded bg-gray-700/70 text-gray-300">
              {channel.category}
            </span>
          )}
        </div>

        {/* 账号 ID */}
        {channel.account_id && (
          <div className="text-[0.688rem] text-gray-500 mt-1">
            账号 ID：{channel.account_id}
          </div>
        )}

        {/* 主页链接 */}
        {channel.homepage_url && (
          <button
            onClick={() => openUrl(channel.homepage_url)}
            title={channel.homepage_url}
            className="text-[0.688rem] text-gray-500 hover:text-red-400 flex items-center gap-1 mt-1 truncate
                bg-transparent border-none cursor-pointer p-0 max-w-full"
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">{channel.homepage_url}</span>
          </button>
        )}

        {/* 简介 */}
        {channel.description && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed whitespace-pre-wrap break-words">
            {channel.description}
          </p>
        )}

        {/* 视频数量 + 入口（仅博主有子视频列表） */}
        {!isVideo && (
          <button
            onClick={onManageVideos}
            className="mt-3 flex items-center gap-1.5 text-[0.688rem] text-gray-400 cursor-pointer
                bg-transparent border-none hover:text-red-400 transition-colors p-0"
          >
            <Link2 size={13} />
            喜欢的视频（{videos.length}）
          </button>
        )}
      </div>

      {/* 操作 */}
      <div className="flex items-start gap-2 shrink-0">
        <button
          onClick={onEdit}
          title="编辑"
          className="p-2 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
              hover:bg-red-500 hover:text-white transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          title="删除"
          className="p-2 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
              hover:bg-red-500 hover:text-white transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

/* ==================== 新增/编辑弹窗 ==================== */

const ChannelFormModal: React.FC<{
  isOpen: boolean;
  isEditing: boolean;
  saving: boolean;
  form: ChannelForm;
  onChange: (form: ChannelForm) => void;
  onClose: () => void;
  onSave: () => void;
}> = ({ isOpen, isEditing, saving, form, onChange, onClose, onSave }) => {
  const inputClass =
    'w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20 rounded-lg ' +
    'text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition-colors';

  const labelClass = 'block text-xs text-gray-400 mb-1.5';

  const set = (patch: Partial<ChannelForm>) => onChange({ ...form, ...patch });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑频道' : '添加频道'}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* 条目类型：博主 / 视频 */}
        <div>
          <label className={labelClass}>类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => set({ kind: 'blogger' })}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                form.kind === 'blogger'
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-neutral-800 border-red-500/20 text-gray-300 hover:border-red-500/50'
              }`}
            >
              👤 博主
            </button>
            <button
              onClick={() => set({ kind: 'video' })}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                form.kind === 'video'
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-neutral-800 border-red-500/20 text-gray-300 hover:border-blue-500/50'
              }`}
            >
              🎬 视频
            </button>
          </div>
          <p className="text-[0.688rem] text-gray-500 mt-1.5">
            {form.kind === 'video'
              ? '记录单条视频，只需填写视频名和链接'
              : '记录一个博主账号，可再添加喜欢的视频'}
          </p>
        </div>

        {/* 头像 */}
        <div>
          <label className={labelClass}>
            {form.kind === 'video' ? '封面图（选填）' : '头像（选填）'}
          </label>
          <div className="flex items-center gap-3">
            {form.avatar.trim() ? (
              <img
                src={form.avatar}
                alt="预览"
                className={`w-12 h-12 object-cover border border-red-500/30 shrink-0 ${
                  form.kind === 'video' ? 'rounded-lg' : 'rounded-full'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.25';
                }}
              />
            ) : (
              <div
                className={`w-12 h-12 bg-neutral-800 border border-red-500/20 shrink-0 ${
                  form.kind === 'video' ? 'rounded-lg' : 'rounded-full'
                }`}
              />
            )}
            <input
              className={inputClass}
              placeholder="图片 URL 或本地路径"
              value={form.avatar}
              onChange={(e) => set({ avatar: e.target.value })}
            />
          </div>
        </div>

        {/* 名称：博主是账号名，视频是视频名 */}
        <div>
          <label className={labelClass}>
            {form.kind === 'video' ? '视频名' : '账号名'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            placeholder={
              form.kind === 'video' ? '这条视频叫什么' : '展示用的名字'
            }
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        {/* 链接：博主是主页，视频是视频链接 */}
        <div>
          <label className={labelClass}>
            {form.kind === 'video' ? '视频链接' : '主页链接'}
            {form.kind === 'video' && <span className="text-red-500"> *</span>}
          </label>
          <input
            className={inputClass}
            placeholder={
              form.kind === 'video'
                ? 'https://www.bilibili.com/video/BVxxxxxx'
                : '博主个人主页完整链接，如 https://space.bilibili.com/123456'
            }
            value={form.homepage_url}
            onChange={(e) => set({ homepage_url: e.target.value })}
          />
        </div>

        {/* 以下字段仅博主需要 */}
        {form.kind === 'blogger' && (
          <>
            {/* 账号 ID */}
            <div>
              <label className={labelClass}>账号 ID</label>
              <input
                className={inputClass}
                placeholder="平台内的账号标识，如 UID"
                value={form.account_id}
                onChange={(e) => set({ account_id: e.target.value })}
              />
            </div>
          </>
        )}

        {/* 平台（两种类型都适用） */}
        <div>
          <label className={labelClass}>平台</label>
          <input
            className={inputClass}
            placeholder="如 Bilibili"
            value={form.platform}
            onChange={(e) => set({ platform: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PLATFORM_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => set({ platform: p })}
                className="px-2 py-0.5 text-[0.625rem] rounded bg-gray-700/60 text-gray-300
                    cursor-pointer border-none hover:bg-red-500 hover:text-white transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 类型（内容题材） */}
        <div>
          <label className={labelClass}>题材</label>
          <input
            className={inputClass}
            placeholder="内容题材，如 情感、做饭"
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {CATEGORY_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => set({ category: c })}
                className="px-2 py-0.5 text-[0.625rem] rounded bg-gray-700/60 text-gray-300
                    cursor-pointer border-none hover:bg-red-500 hover:text-white transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 简介 */}
        <div>
          <label className={labelClass}>
            {form.kind === 'video' ? '备注（选填）' : '简介'}
          </label>
          <textarea
            className={`${inputClass} resize-y min-h-[80px]`}
            placeholder={
              form.kind === 'video'
                ? '为什么收藏这条视频'
                : '这个账号是做什么的、为什么关注'
            }
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>

        {/* 操作 */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-700/70 text-gray-300
                cursor-pointer border-none hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white cursor-pointer
                border-none hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ==================== 视频管理弹窗 ==================== */

const VideoManagerModal: React.FC<{
  channel: Channel | null;
  videos: ChannelVideo[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}> = ({ channel, videos, onClose, onChanged }) => {
  const { showMsg } = useMsg();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  // 切换频道时清空输入
  useEffect(() => {
    setUrl('');
    setTitle('');
  }, [channel?.id]);

  if (!channel) return null;

  const handleAdd = async () => {
    if (!url.trim() && !title.trim()) {
      showMsg('请至少填写视频链接或视频名', 'error');
      return;
    }
    setAdding(true);
    try {
      await invoke('add_channel_video', {
        channelId: channel.id,
        url: url.trim(),
        title: title.trim(),
      });
      setUrl('');
      setTitle('');
      await onChanged();
    } catch (err) {
      showMsg(`添加失败：${err}`, 'error');
      console.error('添加视频失败:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (video: ChannelVideo) => {
    try {
      await invoke('delete_channel_video', { id: video.id });
      await onChanged();
    } catch (err) {
      showMsg(`删除失败：${err}`, 'error');
      console.error('删除视频失败:', err);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20 rounded-lg ' +
    'text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition-colors';

  return (
    <Modal
      isOpen={channel !== null}
      onClose={onClose}
      title={`喜欢的视频 · ${channel.name}`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* 新增视频 */}
        <div className="flex flex-col gap-2 p-3 bg-neutral-800/50 rounded-lg border border-red-500/15">
          <input
            className={inputClass}
            placeholder="视频链接"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="视频名"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="self-end px-3.5 py-1.5 text-xs rounded-md bg-red-500 text-white
                cursor-pointer border-none hover:bg-red-600 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? '添加中…' : '添加视频'}
          </button>
        </div>

        {/* 视频列表 */}
        {videos.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            还没有记录视频
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-neutral-900/80 rounded-lg
                    border border-red-500/10 hover:border-red-500/25 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[0.813rem] text-white truncate">
                    {video.title || '（未命名视频）'}
                  </div>
                  {video.url && (
                    <button
                      onClick={() => openUrl(video.url, showMsg)}
                      title={video.url}
                      className="text-[0.688rem] text-gray-500 hover:text-red-400
                          flex items-center gap-1 mt-0.5 truncate bg-transparent border-none
                          cursor-pointer p-0 max-w-full"
                    >
                      <ExternalLink size={11} className="shrink-0" />
                      <span className="truncate">{video.url}</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(video)}
                  title="删除"
                  className="p-1.5 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                      border-none hover:bg-red-500 hover:text-white transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ChannelPage;
export { ChannelCard, ChannelFormModal, VideoManagerModal };
export type { Channel, ChannelVideo, ChannelWithVideos };
