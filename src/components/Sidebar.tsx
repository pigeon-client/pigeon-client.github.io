import { useState, useMemo, useRef, useEffect } from 'react';
import { useTabStore } from '../store/tabStore';
import { useHistoryStore } from '../store/historyStore';
import { useCollectionStore } from '../store/collectionStore';
import { parseUrl, extractPathSegments } from '../lib/url';
import { HistoryItem, RequestConfig, CollectionNode } from '../types';
import {
	Search,
	Clock,
	FileText,
	Plus,
	Trash2,
	Folder,
	ChevronRight,
	PanelLeftClose,
	PanelLeft,
	X,
	Edit3,
	FolderPlus,
	FilePlus,
} from 'lucide-react';

type SidebarTab = 'collections' | 'history' | 'drafts';

const METHOD_COLORS: Record<string, string> = {
	GET: '#49cc90',
	POST: '#61affe',
	PUT: '#fca130',
	PATCH: '#50e3c2',
	DELETE: '#f93e3e',
};

const TAB_ITEMS: { key: SidebarTab; icon: React.ReactNode; label: string }[] = [
	{ key: 'collections', icon: <Folder size={15} />, label: 'Collections' },
	{ key: 'history', icon: <Clock size={15} />, label: 'History' },
	{ key: 'drafts', icon: <FileText size={15} />, label: 'Drafts' },
];

/* ── Date grouping helper ── */
function getDateBucket(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const dayMs = 86400000;
	if (diff < dayMs) return 'Today';
	if (diff < 2 * dayMs) return 'Yesterday';
	if (diff < 7 * dayMs) return 'This Week';
	if (diff < 14 * dayMs) return 'Last Week';
	return 'Older';
}

function formatTime(timestamp: number): string {
	const d = new Date(timestamp);
	const hours = d.getHours().toString().padStart(2, '0');
	const mins = d.getMinutes().toString().padStart(2, '0');
	return `${hours}:${mins}`;
}

/* ── Tree node component for collection/draft trees ── */
interface TreeNodeProps {
	node: CollectionNode;
	depth: number;
	onSelect: (req: RequestConfig) => void;
	onRename?: (id: string, name: string) => void;
	onDelete?: (id: string) => void;
	onAddFolder?: (parentId: string) => void;
	onAddRequest?: (parentId: string) => void;
}

function TreeNode({
	node,
	depth,
	onSelect,
	onRename,
	onDelete,
	onAddFolder,
	onAddRequest,
}: TreeNodeProps) {
	const [expanded, setExpanded] = useState(true);
	const [renaming, setRenaming] = useState(false);
	const [renameVal, setRenameVal] = useState(node.name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (renaming && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [renaming]);

	const finishRename = () => {
		if (renameVal.trim() && onRename) onRename(node.id, renameVal.trim());
		setRenaming(false);
	};

	if (node.type === 'request') {
		return (
			<div
				className='tree-node'
				style={{ paddingLeft: `${24 + depth * 16}px` }}
				onClick={() => {
					if (node.request) onSelect(node.request);
				}}>
				<span
					className='text-[10px] font-bold w-9 shrink-0'
					style={{ color: METHOD_COLORS[node.method ?? 'GET'] ?? '#999' }}>
					{node.method || 'GET'}
				</span>
				{renaming ? (
					<input
						ref={inputRef}
						value={renameVal}
						onChange={(e) => setRenameVal(e.target.value)}
						onBlur={finishRename}
						onKeyDown={(e) => {
							if (e.key === 'Enter') finishRename();
							if (e.key === 'Escape') setRenaming(false);
						}}
						onClick={(e) => e.stopPropagation()}
						className='flex-1 bg-bg-hover text-[11px] text-text-primary border border-border-primary rounded px-1 py-0.5 outline-none min-w-0'
					/>
				) : (
					<span className='flex-1 text-[11px] text-text-secondary truncate'>
						{node.name}
					</span>
				)}
				{onDelete && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(node.id);
						}}
						className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-accent-red transition-all shrink-0'>
						<Trash2 size={10} />
					</button>
				)}
			</div>
		);
	}

	// Folder node
	return (
		<div>
			<div
				className='tree-node gap-1'
				style={{ paddingLeft: `${20 + depth * 16}px` }}
				onClick={() => setExpanded(!expanded)}>
				<ChevronRight
					size={11}
					className={`text-text-tertiary transition-transform duration-150 shrink-0 ${expanded ? 'rotate-90' : ''}`}
				/>
				<Folder size={12} className='text-accent-orange shrink-0' />
				{renaming ? (
					<input
						ref={inputRef}
						value={renameVal}
						onChange={(e) => setRenameVal(e.target.value)}
						onBlur={finishRename}
						onKeyDown={(e) => {
							if (e.key === 'Enter') finishRename();
							if (e.key === 'Escape') setRenaming(false);
						}}
						onClick={(e) => e.stopPropagation()}
						className='flex-1 bg-bg-hover text-[11px] text-text-primary border border-border-primary rounded px-1 py-0.5 outline-none min-w-0'
					/>
				) : (
					<span className='flex-1 text-[11px] text-text-primary truncate'>
						{node.name}
					</span>
				)}
				<span className='text-[10px] text-text-tertiary'>
					{(node.children ?? []).length}
				</span>
				{/* Quick action buttons */}
				{onAddFolder && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onAddFolder(node.id);
						}}
						className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-primary transition-all shrink-0'
						title='Add folder'>
						<FolderPlus size={11} />
					</button>
				)}
				{onRename && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							setRenaming(true);
							setRenameVal(node.name);
						}}
						className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-primary transition-all shrink-0'
						title='Rename'>
						<Edit3 size={10} />
					</button>
				)}
				{onDelete && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(node.id);
						}}
						className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-accent-red transition-all shrink-0'>
						<Trash2 size={10} />
					</button>
				)}
			</div>
			{expanded &&
				(node.children ?? []).map((child) => (
					<TreeNode
						key={child.id}
						node={child}
						depth={depth + 1}
						onSelect={onSelect}
						onRename={onRename}
						onDelete={onDelete}
						onAddFolder={onAddFolder}
						onAddRequest={onAddRequest}
					/>
				))}
		</div>
	);
}

/* ── Collapsed Icon Strip ── */
function CollapsedSidebar({
	activeTab,
	onTabChange,
	onExpand,
}: {
	activeTab: SidebarTab;
	onTabChange: (tab: SidebarTab) => void;
	onExpand: () => void;
}) {
	return (
		<div className='h-full flex flex-col bg-bg-tertiary border-r border-border-primary shrink-0 transition-all duration-200 w-12'>
			<button
				onClick={onExpand}
				className='p-3 text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer'
				title='Expand sidebar'>
				<PanelLeft size={16} />
			</button>
			<div className='flex flex-col items-center gap-4 py-4 flex-1'>
				{TAB_ITEMS.map(({ key, icon, label }) => (
					<button
						key={key}
						onClick={() => onTabChange(key)}
						className={`p-1.5 rounded cursor-pointer transition-colors ${
							activeTab === key
								? 'text-accent-orange bg-accent-orange/10'
								: 'text-text-secondary hover:bg-bg-hover'
						}`}
						title={label}>
						{icon}
					</button>
				))}
			</div>
		</div>
	);
}

/* ── Sidebar ── */
export function Sidebar() {
	const addTab = useTabStore((s) => s.addTab);
	const setActiveTab = useTabStore((s) => s.setActiveTab);
	const updateTabRequest = useTabStore((s) => s.updateTabRequest);
	const tabs = useTabStore((s) => s.tabs);

	const history = useHistoryStore((s) => s.history);
	const drafts = useHistoryStore((s) => s.drafts);
	const removeDraft = useHistoryStore((s) => s.removeDraft);
	const removeHistory = useHistoryStore((s) => s.removeHistory);

	const collections = useCollectionStore((s) => s.collections);
	const addCollection = useCollectionStore((s) => s.addCollection);
	const deleteCollection = useCollectionStore((s) => s.deleteCollection);
	const addFolder = useCollectionStore((s) => s.addFolder);
	const addRequest = useCollectionStore((s) => s.addRequest);
	const removeNode = useCollectionStore((s) => s.removeNode);
	const renameNode = useCollectionStore((s) => s.renameNode);

	const [activeTab, setActiveTabState] = useState<SidebarTab>('drafts');
	const [search, setSearch] = useState('');
	const [collapsed, setCollapsed] = useState(() => {
		return localStorage.getItem('pigeon-sidebar-collapsed') === 'true';
	});
	// Track expanded state for collection trees: set of collection IDs that are expanded
	const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
		new Set(),
	);

	const searchInputRef = useRef<HTMLInputElement>(null);

	const toggleCollapse = () => {
		const next = !collapsed;
		setCollapsed(next);
		localStorage.setItem('pigeon-sidebar-collapsed', String(next));
	};

	const createNewRequest = () => {
		const id = addTab();
		setActiveTab(id);
	};

	const loadRequest = (req: RequestConfig) => {
		if (tabs.length === 1 && !tabs[0].request.url) {
			updateTabRequest(tabs[0].id, req);
			setActiveTab(tabs[0].id);
		} else {
			const id = addTab();
			updateTabRequest(id, req);
			setActiveTab(id);
		}
	};

	const filterBySearch = (text: string) =>
		!search || text.toLowerCase().includes(search.toLowerCase());

	/* ── Build draft tree from flat drafts array ── */
	const draftTree = useMemo((): CollectionNode[] => {
		const roots: CollectionNode[] = [];

		for (let draftIdx = 0; draftIdx < drafts.length; draftIdx++) {
			const draft = drafts[draftIdx];
			if (!filterBySearch(draft.name || draft.url || '')) continue;

			// Normalize URL for path extraction (add protocol if missing)
			const normalizedUrl =
				draft.url.startsWith('http://') || draft.url.startsWith('https://')
					? draft.url
					: parseUrl(draft.url);
			const segments = extractPathSegments(normalizedUrl);

			// Walk the tree, creating folders as needed
			let currentChildren = roots;

			for (const seg of segments) {
				let folder = currentChildren.find(
					(n) => n.type === 'folder' && n.name === seg,
				);
				if (!folder) {
					folder = {
						id: `drf-${seg}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
						type: 'folder' as const,
						name: seg,
						children: [],
					};
					currentChildren.push(folder);
				}
				currentChildren = folder.children!;
			}

			// Add the request as a leaf node
			const leaf: CollectionNode = {
				id: `drq-${draft.method}-${draft.url}`,
				type: 'request',
				name: draft.name || draft.url?.split('/').pop() || 'Untitled',
				request: draft,
				method: draft.method,
				url: draft.url,
			};
			// Store draft index for delete lookup
			(leaf as any).draftIndex = draftIdx;

			// Avoid duplicates (same method+url already in tree)
			const dup = currentChildren.find(
				(n) =>
					n.type === 'request' &&
					n.url === draft.url &&
					n.method === draft.method,
			);
			if (!dup) {
				currentChildren.push(leaf);
			}
		}

		return roots;
	}, [drafts, search]);

	/* ── Group history by date ── */
	const groupedHistory = useMemo(() => {
		const buckets: Record<string, HistoryItem[]> = {};
		const bucketOrder = [
			'Today',
			'Yesterday',
			'This Week',
			'Last Week',
			'Older',
		];

		for (const item of history) {
			if (!filterBySearch(item.url)) continue;
			const bucket = getDateBucket(item.timestamp);
			if (!buckets[bucket]) buckets[bucket] = [];
			buckets[bucket].push(item);
		}

		// Sort within each bucket by timestamp descending
		for (const key of Object.keys(buckets)) {
			buckets[key].sort((a, b) => b.timestamp - a.timestamp);
		}

		return {
			buckets,
			bucketOrder: bucketOrder.filter((b) => buckets[b]?.length > 0),
		};
	}, [history, search]);

	/* ── Tab bar ── */
	const renderTabBar = () => (
		<div className='flex shrink-0 border-b border-border-primary'>
			{TAB_ITEMS.map(({ key, icon, label }) => (
				<button
					key={key}
					onClick={() => setActiveTabState(key)}
					className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium cursor-pointer transition-colors ${
						activeTab === key
							? 'text-accent-orange border-b-2 border-accent-orange'
							: 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
					}`}>
					{icon}
					<span className='hidden md:inline'>{label}</span>
				</button>
			))}
		</div>
	);

	/* ── Collections tab content ── */
	const renderCollections = () => (
		<div className='flex-1 overflow-y-auto py-1'>
			{collections.length === 0 ? (
				<div className='px-4 py-8 text-[11px] text-text-tertiary text-center'>
					No collections yet
					<br />
					<button
						onClick={() => addCollection('My Collection').then(() => {})}
						className='mt-2 text-accent-orange hover:underline cursor-pointer'>
						+ Create one
					</button>
				</div>
			) : (
				collections.map((collection) => {
					const isExpanded = expandedCollections.has(collection.id!);
					return (
						<div key={collection.id} className='mb-1'>
							{/* Collection header */}
							<div
								className='group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors rounded-sm mx-1'
								onClick={() => {
									setExpandedCollections((prev) => {
										const next = new Set(prev);
										if (next.has(collection.id!)) next.delete(collection.id!);
										else next.add(collection.id!);
										return next;
									});
								}}>
								<ChevronRight
									size={11}
									className={`text-text-tertiary transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
								/>
								<Folder size={13} className='text-accent-orange shrink-0' />
								<span className='flex-1 text-xs text-text-primary truncate font-medium'>
									{collection.name}
								</span>
								<span className='text-[10px] text-text-tertiary'>
									{collection.root.length}
								</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										const name = prompt('Folder name:');
										if (name?.trim())
											addFolder(collection.id!, null, name.trim());
									}}
									className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-primary transition-all shrink-0'
									title='Add root folder'>
									<FolderPlus size={11} />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										const name = prompt('Request name:');
										if (name?.trim()) {
											const req: RequestConfig = {
												name: name.trim(),
												method: 'GET',
												url: '',
												params: [],
												headers: [],
												bodyType: 'none',
												body: '',
												formData: [],
												multipart: [],
												file: null,
												auth: {
													type: 'none',
													username: '',
													password: '',
													token: '',
													apiKey: '',
													apiValue: '',
													apiAddTo: 'header',
												},
											};
											addRequest(collection.id!, null, name.trim(), req);
										}
									}}
									className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-primary transition-all shrink-0'
									title='Add request'>
									<FilePlus size={11} />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										deleteCollection(collection.id!);
									}}
									className='opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-accent-red transition-all shrink-0'>
									<Trash2 size={11} />
								</button>
							</div>
							{/* Tree content */}
							{isExpanded && (
								<div className='ml-4'>
									{collection.root.map((node) => (
										<TreeNode
											key={node.id}
											node={node}
											depth={0}
											onSelect={loadRequest}
											onRename={(id, name) =>
												renameNode(collection.id!, id, name)
											}
											onDelete={(id) => removeNode(collection.id!, id)}
											onAddFolder={(parentId) => {
												const name = prompt('Folder name:');
												if (name?.trim())
													addFolder(collection.id!, parentId, name.trim());
											}}
											onAddRequest={(parentId) => {
												const name = prompt('Request name:');
												if (name?.trim()) {
													const req: RequestConfig = {
														name: name.trim(),
														method: 'GET',
														url: '',
														params: [],
														headers: [],
														bodyType: 'none',
														body: '',
														formData: [],
														multipart: [],
														file: null,
														auth: {
															type: 'none',
															username: '',
															password: '',
															token: '',
															apiKey: '',
															apiValue: '',
															apiAddTo: 'header',
														},
													};
													addRequest(
														collection.id!,
														parentId,
														name.trim(),
														req,
													);
												}
											}}
										/>
									))}
								</div>
							)}
						</div>
					);
				})
			)}
		</div>
	);

	/* ── History tab content ── */
	const renderHistory = () => (
		<div className='flex-1 overflow-y-auto py-1'>
			{groupedHistory.bucketOrder.length === 0 ? (
				<div className='px-4 py-8 text-[11px] text-text-tertiary text-center'>
					{search ? 'No matching history' : 'No history yet'}
				</div>
			) : (
				groupedHistory.bucketOrder.map((bucket) => (
					<div key={bucket} className='mb-1'>
						<div className='px-3 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider'>
							{bucket}
						</div>
						{groupedHistory.buckets[bucket].map((item, i) => (
							<div
								key={`${item.timestamp}-${i}`}
								onClick={() => loadRequest(item.request)}
								className='group/item flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors rounded-sm mx-1'>
								<span
									className={`text-[9px] font-bold w-7 shrink-0 text-center px-0.5 py-0.5 rounded ${
										item.statusCode >= 200 && item.statusCode < 300
											? 'text-accent-green bg-accent-green/10'
											: item.statusCode >= 400
												? 'text-accent-red bg-accent-red/10'
												: item.statusCode >= 300
													? 'text-accent-orange bg-accent-orange/10'
													: 'text-text-tertiary bg-bg-hover'
									}`}>
									{item.statusCode || '—'}
								</span>
								<span
									className='text-[9px] font-bold w-8 shrink-0'
									style={{ color: METHOD_COLORS[item.method] ?? '#999' }}>
									{item.method}
								</span>
								<span className='text-[11px] text-text-secondary truncate flex-1'>
									{item.name || item.url?.split('/').pop()}
								</span>
								<span className='text-[10px] text-text-tertiary shrink-0 whitespace-nowrap'>
									{formatTime(item.timestamp)}
								</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										removeHistory(history.indexOf(item));
									}}
									className='opacity-0 group-hover/item:opacity-100 p-0.5 rounded text-text-tertiary hover:text-accent-red transition-all shrink-0'>
									<Trash2 size={10} />
								</button>
							</div>
						))}
					</div>
				))
			)}
		</div>
	);

	/* ── Build fast lookup: draft node id → draftIndex ── */
	const draftIdToIndex = useMemo(() => {
		const map = new Map<string, number>();
		const walk = (nodes: CollectionNode[]) => {
			for (const n of nodes) {
				if (n.type === 'request' && (n as any).draftIndex !== undefined) {
					map.set(n.id, (n as any).draftIndex);
				}
				if (n.children) walk(n.children);
			}
		};
		walk(draftTree);
		return map;
	}, [draftTree]);

	/* ── Drafts tab content (auto-organized tree) ── */
	const renderDrafts = () => (
		<div className='flex-1 overflow-y-auto py-1'>
			{draftTree.length === 0 ? (
				<div className='px-4 py-8 text-[11px] text-text-tertiary text-center'>
					{search ? 'No matching drafts' : 'No drafts yet'}
					<br />
					<span className='text-[10px]'>
						Drafts auto-save when you send requests
					</span>
				</div>
			) : (
				draftTree.map((node) => (
					<TreeNode
						key={node.id}
						node={node}
						depth={0}
						onSelect={(req) => loadRequest(req)}
						onDelete={(id) => {
							const idx = draftIdToIndex.get(id);
							if (idx !== undefined) removeDraft(idx);
						}}
					/>
				))
			)}
		</div>
	);

	/* ── Collapsed state ── */
	if (collapsed) {
		return (
			<CollapsedSidebar
				activeTab={activeTab}
				onTabChange={setActiveTabState}
				onExpand={toggleCollapse}
			/>
		);
	}

	/* ── Expanded state ── */
	return (
		<div className='h-full flex flex-col bg-bg-tertiary border-r border-border-primary shrink-0 transition-all duration-200 w-64'>
			{/* Top bar: collapse + new request */}
			<div className='flex items-center gap-1 px-2 py-1 shrink-0'>
				<button
					onClick={toggleCollapse}
					className='btn-icon'
					title='Collapse sidebar'>
					<PanelLeftClose size={14} />
				</button>
				<div className='flex-1' />
				<button onClick={createNewRequest} className='btn-primary text-xs'>
					<Plus size={12} />
					New
				</button>
			</div>

			{/* Tab bar */}
			{renderTabBar()}

			{/* Search */}
			<div className='px-2 py-1.5 shrink-0'>
				<div className='relative'>
					<Search
						size={12}
						className='absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none'
					/>
					<input
						ref={searchInputRef}
						data-sidebar-search
						type='text'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder='Filter...'
						className='w-full pl-7 pr-7 py-1.5 text-xs bg-bg-secondary text-text-primary border border-border-primary rounded-lg placeholder:text-text-tertiary'
					/>
					{search && (
						<button
							onClick={() => setSearch('')}
							className='absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-tertiary hover:text-text-primary cursor-pointer'>
							<X size={12} />
						</button>
					)}
				</div>
			</div>

			{/* Tab content */}
			{activeTab === 'collections' && renderCollections()}
			{activeTab === 'history' && renderHistory()}
			{activeTab === 'drafts' && renderDrafts()}
		</div>
	);
}
