import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Folder,
  FolderCog,
  RotateCcw,
} from 'lucide-react'
import MediaTabs from './MediaTabs.jsx'
import {
  clearFolderOrder,
  readFolderOrder,
  saveFolderOrder,
  sortGroupsByOrder,
} from '../utils/folderOrder.js'
import { groupMediaByFolder } from '../utils/group.js'

export default function FolderOrderPanel({ library }) {
  const [kind, setKind] = useState('audio')
  const [categoryId, setCategoryId] = useState('')
  const [draft, setDraft] = useState({ id: null, keys: [] })

  const categories = library?.[kind] ?? []
  const activeCategory =
    categories.find((category) => category.id === categoryId) ??
    categories[0] ??
    null
  const orderId = activeCategory ? `${kind}:${activeCategory.id}` : null

  const groups = useMemo(
    () => (activeCategory ? groupMediaByFolder(activeCategory.items) : []),
    [activeCategory],
  )

  const storedOrder = useMemo(
    () => (activeCategory ? readFolderOrder(kind, activeCategory.id) : []),
    [kind, activeCategory],
  )

  const order = draft.id === orderId ? draft.keys : storedOrder

  const orderedGroups = useMemo(
    () => sortGroupsByOrder(groups, order),
    [groups, order],
  )

  function handleKindChange(nextKind) {
    setKind(nextKind)
    setCategoryId('')
  }

  function move(index, offset) {
    if (!activeCategory || !orderId) return

    const target = index + offset
    const keys = orderedGroups.map((group) => group.key)

    if (target < 0 || target >= keys.length) return

    ;[keys[index], keys[target]] = [keys[target], keys[index]]
    setDraft({ id: orderId, keys })
    saveFolderOrder(kind, activeCategory.id, keys)
  }

  function resetOrder() {
    if (!activeCategory || !orderId) return

    clearFolderOrder(kind, activeCategory.id)
    setDraft({ id: orderId, keys: [] })
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <FolderCog className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-stone-900">
            Ordem das pastas
          </h3>
          <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
            Defina a sequência em que as pastas aparecem na biblioteca.
          </p>
        </div>
      </div>

      {!library ? (
        <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
          Sincronize a biblioteca para carregar as pastas disponíveis.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
          Nenhuma pasta disponível neste tipo de mídia.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <MediaTabs
              active={kind}
              onChange={handleKindChange}
              counts={{
                audio: library?.stats?.audio ?? 0,
                video: library?.stats?.video ?? 0,
              }}
            />

            <select
              value={activeCategory?.id ?? ''}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label="Categoria"
              className="field-control h-10 px-3 text-xs"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {orderedGroups.length === 0 ? (
            <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
              Esta categoria não tem subpastas para organizar.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {orderedGroups.map((group, index) => (
                <li
                  key={group.key || 'root'}
                  className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Folder className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">
                      {group.name}
                    </p>
                    <p className="truncate text-[11px] text-stone-400">
                      {group.parent ? `${group.parent} · ` : ''}
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'arquivo' : 'arquivos'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${group.name} para cima`}
                      className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === orderedGroups.length - 1}
                      aria-label={`Mover ${group.name} para baixo`}
                      className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-stone-400">
              A ordem fica salva neste navegador.
            </p>
            <button
              type="button"
              onClick={resetOrder}
              className="btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurar padrão
            </button>
          </div>
        </>
      )}
    </div>
  )
}
