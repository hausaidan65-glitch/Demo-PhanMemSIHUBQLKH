import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, X } from 'lucide-react';

import missionApi from '../services/missionApi';

const SOURCE_LABELS = {
  A: 'Nhiệm vụ của Sở Khoa học và Công nghệ',
  B: 'Nhiệm vụ của Bộ/Sở ban ngành khác / dịch vụ phối hợp với đối tác',
};

const EMPTY_FORM = {
  mission_name: '',
  mission_source: 'A',
  description: '',
  status: 'ACTIVE',
};

function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem('admin_info') || 'null');
  } catch {
    return null;
  }
}

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function statusClass(status) {
  return status === 'ACTIVE'
    ? 'border-green-200 bg-green-50 text-green-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
}

export default function MissionManagement() {
  const admin = useMemo(() => getAdmin(), []);
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [missions, setMissions] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [missionSource, setMissionSource] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const fetchMissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (missionSource) params.mission_source = missionSource;
      if (status) params.status = status;
      const response = await missionApi.list(params);
      setMissions(response.data.data || []);
    } catch (error) {
      setMissions([]);
      window.alert(errorMessage(error, 'Không thể tải danh sách nhiệm vụ.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, missionSource, status]);

  useEffect(() => {
    let active = true;
    const params = {};
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    if (missionSource) params.mission_source = missionSource;
    if (status) params.status = status;

    missionApi
      .list(params)
      .then((response) => {
        if (active) setMissions(response.data.data || []);
      })
      .catch((error) => {
        if (!active) return;
        setMissions([]);
        window.alert(errorMessage(error, 'Không thể tải danh sách nhiệm vụ.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedKeyword, missionSource, status]);

  const openCreateModal = () => {
    setEditingMission(null);
    setFormData({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditModal = (mission) => {
    setEditingMission(mission);
    setFormData({
      mission_name: mission.mission_name || '',
      mission_source: mission.mission_source || 'A',
      description: mission.description || '',
      status: mission.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingMission(null);
    setFormData({ ...EMPTY_FORM });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const missionName = formData.mission_name.trim();
    if (!missionName) {
      window.alert('Vui lòng nhập tên nhiệm vụ.');
      return;
    }
    if (missionName.length > 255) {
      window.alert('Tên nhiệm vụ không được vượt quá 255 ký tự.');
      return;
    }

    const infoPayload = {
      mission_name: missionName,
      mission_source: formData.mission_source,
      description: formData.description.trim() || null,
    };

    try {
      setSaving(true);
      if (editingMission) {
        await missionApi.update(editingMission.id, infoPayload);
      } else {
        await missionApi.create({ ...infoPayload, status: formData.status });
      }
      setModalOpen(false);
      setEditingMission(null);
      setFormData({ ...EMPTY_FORM });
      await fetchMissions();
    } catch (error) {
      window.alert(errorMessage(error, 'Không thể lưu nhiệm vụ.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (mission) => {
    const nextStatus = mission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'kích hoạt' : 'ngừng hoạt động';
    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} nhiệm vụ “${mission.mission_name}”?`)) {
      return;
    }

    try {
      setChangingStatusId(mission.id);
      await missionApi.changeStatus(mission.id, nextStatus);
      await fetchMissions();
    } catch (error) {
      window.alert(errorMessage(error, 'Không thể cập nhật trạng thái nhiệm vụ.'));
    } finally {
      setChangingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý danh mục nhiệm vụ báo cáo thuộc nguồn A và nguồn B.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchMissions}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            >
              <Plus size={18} />
              Thêm nhiệm vụ
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_260px_220px]">
        <input
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setLoading(true);
          }}
          placeholder="Tìm tên hoặc mô tả nhiệm vụ..."
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        />
        <select
          value={missionSource}
          onChange={(event) => {
            setMissionSource(event.target.value);
            setLoading(true);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        >
          <option value="">Tất cả nguồn nhiệm vụ</option>
          <option value="A">Nguồn A</option>
          <option value="B">Nguồn B</option>
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setLoading(true);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">STT</th>
                <th className="px-5 py-4">Tên nhiệm vụ</th>
                <th className="px-5 py-4">Nguồn</th>
                <th className="px-5 py-4">Mô tả</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Cập nhật</th>
                {isSuperAdmin && <th className="px-5 py-4 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="px-5 py-16 text-center">
                    <Loader2 size={30} className="mx-auto animate-spin text-green-600" />
                    <p className="mt-3 text-sm text-slate-500">Đang tải danh sách nhiệm vụ...</p>
                  </td>
                </tr>
              ) : missions.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="px-5 py-16 text-center text-slate-500">
                    Không tìm thấy nhiệm vụ phù hợp.
                  </td>
                </tr>
              ) : (
                missions.map((mission, index) => (
                  <tr key={mission.id} className="border-b border-slate-100 text-sm hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-slate-600">{index + 1}</td>
                    <td className="max-w-[300px] px-5 py-4 font-semibold text-slate-900">
                      {mission.mission_name}
                    </td>
                    <td className="max-w-[340px] px-5 py-4">
                      <span className="font-semibold text-slate-900">{mission.mission_source}</span>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {SOURCE_LABELS[mission.mission_source] || '—'}
                      </p>
                    </td>
                    <td className="max-w-[360px] px-5 py-4 text-slate-600">
                      <p className="line-clamp-3">{mission.description || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(mission.status)}`}>
                        {mission.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(mission.updated_at)}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(mission)}
                            className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(mission)}
                            disabled={changingStatusId === mission.id}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {changingStatusId === mission.id
                              ? 'Đang xử lý...'
                              : mission.status === 'ACTIVE'
                                ? 'Ngừng hoạt động'
                                : 'Kích hoạt'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingMission ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ mới'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nguồn A/B được lưu theo mã A hoặc B trên hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Đóng"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="mission-name">
                  Tên nhiệm vụ <span className="text-red-500">*</span>
                </label>
                <input
                  id="mission-name"
                  required
                  maxLength={255}
                  value={formData.mission_name}
                  onChange={(event) => updateField('mission_name', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />

                <label className="mb-2 mt-5 block text-sm font-medium text-slate-700" htmlFor="mission-source">
                  Nguồn nhiệm vụ <span className="text-red-500">*</span>
                </label>
                <select
                  id="mission-source"
                  required
                  value={formData.mission_source}
                  onChange={(event) => updateField('mission_source', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                >
                  <option value="A">A — {SOURCE_LABELS.A}</option>
                  <option value="B">B — {SOURCE_LABELS.B}</option>
                </select>

                <label className="mb-2 mt-5 block text-sm font-medium text-slate-700" htmlFor="mission-description">
                  Mô tả
                </label>
                <textarea
                  id="mission-description"
                  rows={5}
                  value={formData.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />

                {!editingMission && (
                  <>
                    <label className="mb-2 mt-5 block text-sm font-medium text-slate-700" htmlFor="mission-status">
                      Trạng thái
                    </label>
                    <select
                      id="mission-status"
                      value={formData.status}
                      onChange={(event) => updateField('status', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    >
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="INACTIVE">Ngừng hoạt động</option>
                    </select>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingMission ? 'Lưu thay đổi' : 'Thêm nhiệm vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
