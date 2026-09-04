"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const MAX_IMAGES = 5;
const MAX_UPLOAD_BYTES = 850 * 1024;

function formatMoment(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = 0.82;
  let blob;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    quality -= 0.12;
  } while (blob && blob.size > MAX_UPLOAD_BYTES && quality >= 0.45);
  if (!blob) throw new Error("Não foi possível preparar uma das imagens.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function ActivityRecords({ admin }) {
  const [records, setRecords] = useState([]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [remaining, setRemaining] = useState(MAX_IMAGES);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [leadershipSearch, setLeadershipSearch] = useState("");
  const pendingCount = useMemo(() => records.filter((record) => record.status === "pending").length, [records]);
  const groupedRecords = useMemo(() => {
    const search = normalizeSearch(leadershipSearch);
    const visible = !admin || !search ? records : records.filter((record) => normalizeSearch(record.leadershipName).includes(search));
    return visible.reduce((groups, record) => {
      const key = record.leadershipId || record.leadershipName;
      if (!groups.has(key)) groups.set(key, { id: key, name: record.leadershipName, records: [] });
      groups.get(key).records.push(record);
      return groups;
    }, new Map());
  }, [admin, leadershipSearch, records]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/daily-activities", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os registros.");
      setRecords(data.records || []);
      if (!admin) setRemaining(data.remainingToday ?? MAX_IMAGES);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    previews.forEach((url) => URL.revokeObjectURL(url));
    if (selected.length > remaining) {
      setFiles([]);
      setPreviews([]);
      setMessage(`Você pode selecionar somente ${remaining} imagem(ns) hoje.`);
      event.target.value = "";
      return;
    }
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!files.length) return setMessage("Selecione pelo menos uma imagem.");
    setSaving(true);
    setMessage("Preparando e enviando as imagens…");
    try {
      const prepared = [];
      for (const file of files) prepared.push(await compressImage(file));
      const form = new FormData();
      form.append("description", description);
      prepared.forEach((file) => form.append("images", file));
      const response = await fetch("/api/daily-activities", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar a atividade.");
      setRecords((current) => [data.item, ...current]);
      setRemaining(data.remainingToday);
      setDescription("");
      setFiles([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      event.currentTarget.reset();
      setMessage("Atividade registrada e enviada para análise da administração.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const deferRecord = async (record) => {
    if (!window.confirm(`Deferir o registro de ${record.leadershipName}?`)) return;
    try {
      const response = await fetch("/api/daily-activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "defer", id: record.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível deferir o registro.");
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: data.status, reviewedAt: data.reviewedAt } : item));
      setMessage("Registro deferido com sucesso.");
    } catch (error) { setMessage(error.message); }
  };

  const deleteRecord = async (record) => {
    if (!window.confirm(`Excluir definitivamente este registro de ${record.leadershipName}? As imagens também serão apagadas. Esta ação não pode ser desfeita.`)) return;
    setDeletingId(record.id);
    try {
      const response = await fetch(`/api/daily-activities?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir o registro.");
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setMessage("Registro e imagens excluídos com sucesso.");
    } catch (error) { setMessage(error.message); }
    finally { setDeletingId(""); }
  };

  const renderRecord = (record) => <article className="activity-card" key={record.id}>
    <div className="activity-card-head"><div><span>{formatMoment(record.createdAt)} (horário de Manaus)</span></div><span className={`activity-status ${record.status}`}>{record.status === "deferred" ? "✓ Deferido" : "Aguardando análise"}</span></div>
    <p>{record.description}</p>
    <div className="activity-gallery">{record.images.map((image, index) => <a href={image.url} target="_blank" rel="noreferrer" className="activity-image" key={image.id}><Image src={image.url} alt={`Registro de atividade ${index + 1}`} fill unoptimized sizes="(max-width: 600px) 50vw, 220px"/></a>)}</div>
    {admin && <div className="activity-actions">
      {record.status === "pending" && <button className="primary" disabled={deletingId === record.id} onClick={() => deferRecord(record)}>✓ Deferir registro</button>}
      <button className="danger" disabled={deletingId === record.id} onClick={() => deleteRecord(record)}>{deletingId === record.id ? "Excluindo…" : "Excluir registro"}</button>
    </div>}
    {record.reviewedAt && <small className="activity-reviewed">Analisado em {formatMoment(record.reviewedAt)}</small>}
  </article>;

  return <div className="activity-layout">
    {!admin && <section className="panel activity-form-panel">
      <div className="page-head"><div><h2>Registro de atividade diária</h2><p>Registre aqui as atividades do dia, incluindo imagens em grupo, reuniões, visitas e abordagens.</p></div><span className="activity-limit">{remaining} de 5 imagens disponíveis hoje</span></div>
      <form onSubmit={submit}>
        <label className="field"><span>Descrição da atividade *</span><textarea required minLength={5} maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Conte o que foi realizado, onde aconteceu e quem participou."/></label>
        <label className="activity-upload"><span>＋ Selecionar imagens</span><small>Escolha até {remaining} imagem(ns). JPG, PNG ou WebP.</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!remaining || saving} onChange={selectFiles}/></label>
        {!!previews.length && <div className="activity-preview-grid">{previews.map((url, index) => <div className="activity-image" key={url}><Image src={url} alt={`Imagem selecionada ${index + 1}`} fill unoptimized sizes="(max-width: 600px) 50vw, 180px"/></div>)}</div>}
        <button className="primary submit" disabled={saving || !remaining}>{saving ? "Enviando…" : "Registrar atividade"}</button>
      </form>
    </section>}
    <section className="panel">
      <div className="page-head"><div><h2>{admin ? "Registros de atividade" : "Meus registros"}</h2><p>{admin ? `${pendingCount} registro(s) aguardando análise.` : "A data e a hora são registradas automaticamente pelo sistema."}</p></div></div>
      {admin && <label className="field activity-leadership-search"><span>Pesquisar liderança</span><input type="search" value={leadershipSearch} onChange={(event) => setLeadershipSearch(event.target.value)} placeholder="Digite o nome da liderança"/></label>}
      {message && <div className="result">{message}</div>}
      {loading ? <div className="empty">Carregando registros…</div> : !records.length ? <div className="empty">Nenhuma atividade foi registrada ainda.</div> : admin ?
        !groupedRecords.size ? <div className="empty">Nenhuma liderança encontrada para esta pesquisa.</div> :
        <div className="activity-leadership-groups">{Array.from(groupedRecords.values()).map((group) => <section className="activity-leadership-group" key={group.id}>
          <div className="activity-leadership-heading"><div><span>Liderança</span><h3>{group.name}</h3></div><b>{group.records.length} registro(s)</b></div>
          <div className="activity-list">{group.records.map(renderRecord)}</div>
        </section>)}</div> : <div className="activity-list">{records.map(renderRecord)}</div>}
    </section>
  </div>;
}
