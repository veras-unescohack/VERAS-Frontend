import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import '../styles/forum.css';

const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_URL = rawUrl.replace(/\/+$/, '');

export default function CommunityForum() {
  const { token, isAuthenticated } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postDetail, setPostDetail] = useState(null);

  // Filtros y paginación
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  // Estados de formularios y modal de autenticación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 6 });
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`${API_URL}/forum/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setHasNext(data.has_next);
      }
    } catch (err) {
      console.error('Error al cargar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetail = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/forum/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPostDetail(data);
        setSelectedPostId(id);
      }
    } catch (err) {
      console.error('Error al obtener detalle del post:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPostId) {
      fetchPosts();
    }
  }, [page, selectedPostId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    if (!isAuthenticated) {
      setShowCreateModal(false);
      setShowAuthModal(true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent.trim() })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewContent('');
        setPage(1);
        fetchPosts();
      } else if (res.status === 401) {
        setShowCreateModal(false);
        setShowAuthModal(true);
      }
    } catch (err) {
      console.error('Error al crear post:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpvote = async () => {
    if (!selectedPostId) return;

    try {
      const res = await fetch(`${API_URL}/forum/posts/${selectedPostId}/upvote`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setPostDetail((prev) => ({ ...prev, upvotes: data.upvotes }));
      }
    } catch (err) {
      console.error('Error al votar:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/forum/posts/${selectedPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newCommentText.trim() })
      });

      if (res.ok) {
        const createdComment = await res.json();
        setPostDetail((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          comments_count: (prev.comments_count || 0) + 1
        }));
        setNewCommentText('');
      } else if (res.status === 401) {
        setShowAuthModal(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}: No se pudo procesar.`);
      }

    } catch (err) {
      // console.error('Error al agregar comentario:', err);
      setErrorMsg(`Error al agregar comentario: ${err}`);
    }
  };

  return (
    <div className="forum-container">
      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {/* VISTA 1: LISTADO DE THREADS */}
      {!selectedPostId ? (
        <>
          <form onSubmit={handleSearchSubmit} className="forum-search-box">
            <span className="material-symbols-outlined" style={{ color: '#64748b' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por tags o palabras clave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </form>

          <div className="forum-controls">
            <button onClick={handleOpenCreateModal} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Crear Thread
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', margin: '40px 0' }}>Cargando discusiones...</p>
          ) : (
            <div className="threads-list">
              {posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0' }}>No se encontraron posts.</p>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="thread-card">
                    <div className="thread-header">
                      <span className="thread-meta">Iniciado por <b>@{post.author}</b></span>
                    </div>

                    <h3 className="thread-title">{post.title}</h3>
                    <p className="thread-summary">{post.summary}</p>

                    <div className="thread-footer">
                      <div className="tags-container">
                        {post.tags.map((t, idx) => (
                          <span key={idx} className="tag-badge">#{t}</span>
                        ))}
                      </div>

                      <button onClick={() => fetchPostDetail(post.id)} className="btn-secondary">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span>
                        {post.comments_count} {post.comments_count === 1 ? 'comentario' : 'comentarios'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="pagination-controls">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary"
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Página {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary"
            >
              Siguiente
            </button>
          </div>
        </>
      ) : (
        /* VISTA 2: DETALLE, UPVOTES Y COMENTARIOS */
        <div className="thread-detail-container">
          <button
            onClick={() => { setSelectedPostId(null); setPostDetail(null); }}
            className="btn-secondary"
            style={{ width: 'fit-content' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Volver al foro
          </button>

          {postDetail && (
            <>
              <div className="detail-main-card">
                <div className="detail-header-row">
                  <div>
                    <span className="thread-meta">Iniciado por <b>@{postDetail.author}</b></span>
                    <h2 style={{ margin: '6px 0 10px 0', color: '#0f172a' }}>{postDetail.title}</h2>
                  </div>
                  <button onClick={handleUpvote} className="upvote-btn" title="Apoyar hilo">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>thumb_up</span>
                    <span>{postDetail.upvotes}</span>
                  </button>
                </div>

                <div className="detail-summary-box">
                  <strong>Resumen IA: </strong>{postDetail.summary}
                </div>

                <div className="tags-container" style={{ marginBottom: '14px' }}>
                  {postDetail.tags.map((t, idx) => (
                    <span key={idx} className="tag-badge">#{t}</span>
                  ))}
                </div>

                <div className="detail-body">{postDetail.content}</div>
              </div>

              <div className="comments-section">
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                  Respuestas ({postDetail.comments ? postDetail.comments.length : 0})
                </h3>

                <div className="comments-list">
                  {postDetail.comments && postDetail.comments.length > 0 ? (
                    postDetail.comments.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-author">@{comment.author}</div>
                        <p className="comment-text">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aún no hay comentarios. Sé el primero en responder.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-form">
                  <textarea
                    rows="3"
                    placeholder={isAuthenticated ? "Añadir una respuesta o aportar fuentes..." : "Inicia sesión para responder a este thread..."}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="modal-textarea"
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                      Comentar
                    </button>
                  </div>
                </form>

              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL SIMPLIFICADO: SÓLO EL MENSAJE */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Iniciar Nuevo Thread</h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                rows="5"
                placeholder="Escribe tu mensaje, caso o información a debatir (Gemini generará el título, resumen y tags automáticamente)..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="modal-textarea"
                disabled={creating}
                minLength={10}
                required
              />

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" disabled={creating}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating || !newContent.trim()}>
                  {creating ? 'Procesando con IA...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LOGIN CUANDO SE INTENTA INTERACTUAR SIN SESIÓN */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}