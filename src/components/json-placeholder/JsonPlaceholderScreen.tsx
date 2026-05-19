import React, { useState } from 'react';
import { useJsonPlaceholder } from '../../hooks/useJsonPlaceholder';
import { SECTION_CONFIGS } from '../../config';
import type { JsonPlaceholderResourceType } from '../../types/json-placeholder';

const config = SECTION_CONFIGS.jsonplaceholder;

const RESOURCE_TYPES: Array<{ value: JsonPlaceholderResourceType; label: string; emoji: string }> = [
  { value: 'posts', label: 'Posts', emoji: '📝' },
  { value: 'users', label: 'Users', emoji: '👤' },
  { value: 'todos', label: 'Todos', emoji: '✅' },
];

export const JsonPlaceholderScreen: React.FC = () => {
  const { fetchPosts, fetchUsers, fetchTodos, createPost } = useJsonPlaceholder();

  const [selectedResource, setSelectedResource] =
    useState<JsonPlaceholderResourceType>('posts');
  const [resourceId, setResourceId] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');

  // R02: reset all fetch mutations when switching resource to clear stale data
  const handleResourceChange = (r: JsonPlaceholderResourceType) => {
    setSelectedResource(r);
    setResourceId('');
    fetchPosts.reset();
    fetchUsers.reset();
    fetchTodos.reset();
  };

  const handleFetch = () => {
    // A2: empty resourceId → undefined → full list returned (spec US2-AC3)
    const id = resourceId.trim() ? +resourceId : undefined;
    if (selectedResource === 'posts') fetchPosts.mutate(id);
    else if (selectedResource === 'users') fetchUsers.mutate(id);
    else fetchTodos.mutate(id);
  };

  const handleCreate = () => {
    createPost.mutate({
      title: newPostTitle.trim(),
      body: newPostBody.trim(),
      userId: 1,
    });
  };

  // Compute active-resource state from the correct mutation
  const isFetchPending =
    selectedResource === 'posts'
      ? fetchPosts.isPending
      : selectedResource === 'users'
        ? fetchUsers.isPending
        : fetchTodos.isPending;

  const isFetchError =
    selectedResource === 'posts'
      ? fetchPosts.isError
      : selectedResource === 'users'
        ? fetchUsers.isError
        : fetchTodos.isError;

  const fetchError =
    selectedResource === 'posts'
      ? fetchPosts.error
      : selectedResource === 'users'
        ? fetchUsers.error
        : fetchTodos.error;

  // R01: each mutation returns list | single-item union; use Array.isArray to discriminate
  const fetchData =
    selectedResource === 'posts'
      ? fetchPosts.data
      : selectedResource === 'users'
        ? fetchUsers.data
        : fetchTodos.data;

  const activeLabel =
    RESOURCE_TYPES.find((r) => r.value === selectedResource)?.label ?? selectedResource;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">{config.icon} {config.displayName}</h1>
          <p className="text-indigo-100 text-sm">
            Sample integration using{' '}
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              {config.docsLabel}
            </a>
            . No API key required. Base URL:{' '}
            <code className="bg-indigo-400/40 px-1 rounded">{config.baseUrl}</code>
          </p>
          {config.notice && (
            <p className="text-indigo-200 text-xs mt-1">{config.notice}</p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* Resource Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Resource Type</h2>
          <div className="flex gap-2 flex-wrap">
            {RESOURCE_TYPES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => handleResourceChange(value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedResource === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Fetch Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Fetch {activeLabel}</h2>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID{' '}
                <span className="text-gray-400 font-normal">
                  (optional — leave empty for full list)
                </span>
              </label>
              <input
                type="number"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="e.g. 1"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={isFetchPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              {isFetchPending ? '⏳ Fetching…' : '🔍 Fetch'}
            </button>
          </div>

          {isFetchError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {fetchError instanceof Error ? fetchError.message : 'Error fetching resource'}
              {resourceId && (
                <span className="block text-xs mt-1 text-red-400">
                  ID {resourceId} may not exist — leave the ID field empty for the full list.
                </span>
              )}
            </p>
          )}

          {fetchData !== undefined && !isFetchPending && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {Array.isArray(fetchData)
                  ? `${fetchData.length} item${fetchData.length !== 1 ? 's' : ''} returned`
                  : 'Single item returned'}
              </p>
              <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-auto max-h-80 text-gray-800">
                {JSON.stringify(fetchData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Create Post — Posts resource only (US3 / P3) */}
        {selectedResource === 'posts' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-gray-900">Create Post</h2>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Simulated — not persisted
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Post title…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={newPostBody}
                onChange={(e) => setNewPostBody(e.target.value)}
                placeholder="Post content…"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={newPostTitle.trim() === '' || createPost.isPending}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              {createPost.isPending ? '⏳ Creating…' : '➕ Create Post'}
            </button>

            {createPost.isError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {createPost.error instanceof Error
                  ? createPost.error.message
                  : 'Error creating post'}
              </p>
            )}

            {createPost.data && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  ✅ Created (HTTP 201) — synthetic response, not persisted server-side
                </p>
                <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-auto max-h-48 text-gray-800">
                  {JSON.stringify(createPost.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
