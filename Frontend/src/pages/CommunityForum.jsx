import React, { useState, useEffect } from 'react';
import '../styles/forum.css';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function CommunityForum() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postDetail, setPostDetail] = useState(null);
  
  // Filtros y paginación
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  
  // Estados para modales/formularios
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', author: '', summary: '', content: '', category: 'General', tags: '' });
  const [newComment, setNewComment] = useState({ author: '', text: '' });

  // Cargar listado de posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 6 });
      if (search.trim()) params.append('search', search.trim());
      if (category !== 'Todas') params.append('category', category);

      const res = await fetch(`${API_URL}/forum/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setHasNext(data.has_next);
      }
    } catch (err) {
      console.error("Error al cargar posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar detalle de un post
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
      console.error("Error al obtener detalle del post:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPostId) {
      fetchPosts();
    }
  }, [page, category, selectedPostId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.author) return;

    try {
      const tagsArray = newPost.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`${API_URL}/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPost, tags: tagsArray })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewPost({ title: '', author: '', summary: '', content: '', category: 'General', tags: '' });
        setPage(1);
        fetchPosts();
      }
    } catch (err) {
      console.error("Error al crear post:", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.author || !newComment.text) return;

    try {
      const res = await fetch(`${API_URL}/forum/posts/${selectedPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment)
      });

      if (res.ok) {
        const createdComment = await res.json();
        setPostDetail(prev => ({
          ...prev,
          comments: [...prev.comments, createdComment],
          comments_count: prev.comments_count + 1
        }));
        setNewComment({ author: '', text: '' });
      }
    } catch (err) {
      console.error("Error al agregar comentario:", err);
    }
  };

  return (
    <div className="forum-container">
      {/* VISTA 1: LISTADO DE POSTS */}
      {!selectedPostId ? (
        <>
          <form onSubmit={handleSearchSubmit} className="forum-search-box">
            <span className="material-symbols-outlined" style={{ color: '#64748b' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por temas, palabras clave o tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </form>

          <div className="forum-controls">
            <div className="filter-group">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#475569' }}>filter_list</span>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="category-select"
              >
                <option value="Todas">Todas las categorías</option>
                <option value="Noticias">Noticias</option>
                <option value="Medios & IA">Medios & IA</option>
                <option value="Fact-Checking">Fact-Checking</option>
                <option value="Educación">Educación</option>
              </select>
            </div>

            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Crear Thread
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', margin: '40px 0' }}>Cargando discusiones...</p>
          ) : (
            <div className="threads-list">
              {posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0' }}>No se encontraron posts en esta categoría.</p>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="thread-card">
                    <div className="thread-header">
                      <span className="thread-meta">Publicado por <b>{post.author}</b></span>
                      <span className="thread-category">{post.category}</span>
                    </div>

                    <h3 className="thread-title">{post.title}</h3>
                    <p className="thread-summary">{post.summary}</p>

                    <div className="thread-footer">
                      <div className="tags-container">
                        {post.tags.map((t, idx) => (
                          <span key={idx} className="tag-badge">#{t}</span>
                        ))}
                      </div>

                      <div className="thread-actions">
                        <button onClick={() => fetchPostDetail(post.id)} className="btn-secondary">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span>
                          {post.comments_count} {post.comments_count === 1 ? 'comentario' : 'comentarios'}
                        </button>
                      </div>
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
        /* VISTA 2: DETALLE DEL THREAD Y COMENTARIOS */
        <div className="thread-detail-container">
          <button onClick={() => { setSelectedPostId(null); setPostDetail(null); }} className="btn-secondary" style={{ width: 'fit-content' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Volver al foro
          </button>

          {postDetail && (
            <>
              <div className="detail-main-card">
                <div className="thread-header">
                  <span className="thread-meta">Iniciado por <b>{postDetail.author}</b></span>
                  <span className="thread-category">{postDetail.category}</span>
                </div>
                <h2 style={{ margin: '8px 0 12px 0', color: '#0f172a' }}>{postDetail.title}</h2>
                <div className="tags-container" style={{ marginBottom: '16px' }}>
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
                        <div className="comment-author">{comment.author}</div>
                        <p className="comment-text">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aún no hay comentarios en este thread. Sé el primero.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-form">
                  <input
                    type="text"
                    placeholder="Tu nombre o alias..."
                    value={newComment.author}
                    onChange={(e) => setNewComment({ ...newComment, author: e.target.value })}
                    className="modal-input"
                    required
                  />
                  <textarea
                    rows="3"
                    placeholder="Añadir una respuesta o contrastar información..."
                    value={newComment.text}
                    onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
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

      {/* MODAL PARA CREAR THREAD */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Iniciar Nuevo Thread</h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Título del debate o caso..."
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="modal-input"
                required
              />
              <input
                type="text"
                placeholder="Tu alias o autor..."
                value={newPost.author}
                onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                className="modal-input"
                required
              />
              <input
                type="text"
                placeholder="Resumen corto (1-2 oraciones)..."
                value={newPost.summary}
                onChange={(e) => setNewPost({ ...newPost, summary: e.target.value })}
                className="modal-input"
                required
              />
              <select
                value={newPost.category}
                onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                className="category-select"
              >
                <option value="General">General</option>
                <option value="Noticias">Noticias</option>
                <option value="Medios & IA">Medios & IA</option>
                <option value="Fact-Checking">Fact-Checking</option>
                <option value="Educación">Educación</option>
              </select>
              <input
                type="text"
                placeholder="Tags separados por coma (ej. deepfake, elecciones, bot)..."
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                className="modal-input"
              />
              <textarea
                rows="4"
                placeholder="Contenido completo y argumentos a debatir..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="modal-textarea"
                required
              />

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}