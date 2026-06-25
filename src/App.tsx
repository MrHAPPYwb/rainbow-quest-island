import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  Coins,
  Gem,
  Home,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Volume2,
} from 'lucide-react'
import './App.css'
import {
  getDailyTasks,
  getSubjectTasks,
  subjects,
  type LearningTask,
  type MarketItem,
  type SubjectId,
} from './content'
import {
  createBlankProgress,
  loadProgress,
  recordTaskDone,
  resetProgress,
  type LearnerProgress,
} from './storage'

type Toast = {
  kind: 'guide' | 'win' | 'miss'
  text: string
}

const zoneCopy: Record<SubjectId, { label: string; marker: string }> = {
  chinese: { label: '古字洞', marker: '刻' },
  math: { label: '玩具铺', marker: '买' },
  english: { label: '宝石湾', marker: '拼' },
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) {
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.82
  window.speechSynthesis.speak(utterance)
}

function sameItems(a: string[], b: string[]) {
  return a.length === b.length && a.every((item) => b.includes(item))
}

function ParentPanel({
  progress,
  onReset,
  onClose,
}: {
  progress: LearnerProgress
  onReset: () => void
  onClose: () => void
}) {
  const totalDone = progress.completedTaskIds.length

  return (
    <section className="parent-sheet" aria-label="家长面板">
      <div className="sheet-head">
        <div>
          <ShieldCheck size={18} />
          <h2>家长面板</h2>
        </div>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="parent-grid">
        <div>
          <strong>{progress.stars}</strong>
          <span>星光</span>
        </div>
        <div>
          <strong>{progress.streakDays}</strong>
          <span>连续天</span>
        </div>
        <div>
          <strong>{totalDone}</strong>
          <span>通关</span>
        </div>
      </div>
      <p>建议每天玩 8-12 分钟。进度只保存在本机，不上传孩子数据。</p>
      <button type="button" className="reset-button" onClick={onReset}>
        <RotateCcw size={17} />
        <span>重置进度</span>
      </button>
    </section>
  )
}

function GlyphQuest({
  task,
  completed,
  onComplete,
}: {
  task: LearningTask
  completed: boolean
  onComplete: (message: string) => void
}) {
  const glyph = task.glyph
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
  }, [task.id])

  if (!glyph) {
    return null
  }

  const glyphData = glyph
  const current = glyphData.steps[step]
  const isLast = step === glyphData.steps.length - 1

  function carve() {
    if (completed) {
      return
    }

    if (isLast) {
      onComplete(`你把${glyphData.objectName}刻成了“${glyphData.character}”。`)
      return
    }

    setStep((value) => value + 1)
  }

  return (
    <div className="mini-game glyph-quest">
      <div className="stone-stage">
        <div className="stone-glow" />
        <span className="ancient-shape">{current.shape}</span>
        <strong>{current.title}</strong>
      </div>
      <div className="quest-text">
        <h2>{task.title}</h2>
        <p>{current.text}</p>
      </div>
      <div className="evolve-track">
        {glyphData.steps.map((part, index) => (
          <span className={index <= step ? 'on' : ''} key={part.title}>
            {part.shape}
          </span>
        ))}
      </div>
      <button type="button" className="game-action" onClick={carve}>
        <Sparkles size={18} />
        <span>{completed ? '已点亮' : current.action}</span>
      </button>
    </div>
  )
}

function WordTreasureQuest({
  task,
  completed,
  onComplete,
}: {
  task: LearningTask
  completed: boolean
  onComplete: (message: string) => void
}) {
  const english = task.english
  const [pickedLetters, setPickedLetters] = useState<string[]>([])
  const [pickedIndexes, setPickedIndexes] = useState<number[]>([])
  const [hint, setHint] = useState('按顺序点亮字母宝石。')

  useEffect(() => {
    setPickedLetters([])
    setPickedIndexes([])
    setHint('按顺序点亮字母宝石。')
  }, [task.id])

  if (!english) {
    return null
  }

  const englishData = english

  function pickLetter(letter: string, index: number) {
    if (completed || pickedIndexes.includes(index)) {
      return
    }

    const expected = englishData.word[pickedLetters.length]
    if (letter !== expected) {
      setHint(`这颗 ${letter.toUpperCase()} 宝石还没发光。`)
      return
    }

    const nextLetters = [...pickedLetters, letter]
    setPickedLetters(nextLetters)
    setPickedIndexes([...pickedIndexes, index])
    setHint('宝箱的锁正在转动。')

    if (nextLetters.join('') === englishData.word) {
      speak(englishData.sentence, 'en-US')
      onComplete(`打开${englishData.treasure}。`)
    }
  }

  return (
    <div className="mini-game treasure-quest">
      <div className={completed ? 'chest open' : 'chest'}>
        <Gem size={28} />
        <div>
          <h2>{task.title}</h2>
          <p>{englishData.clue}</p>
        </div>
        <button
          type="button"
          className="round-sound"
          onClick={() => speak(englishData.sound, 'en-US')}
        >
          <Volume2 size={19} />
        </button>
      </div>
      <div className="word-runes">
        {englishData.word.split('').map((letter, index) => (
          <span key={`${letter}-${index}`}>{pickedLetters[index] ?? ''}</span>
        ))}
      </div>
      <div className="gem-bank">
        {englishData.letters.map((letter, index) => (
          <button
            type="button"
            className={pickedIndexes.includes(index) ? 'gem used' : 'gem'}
            key={`${letter}-${index}`}
            onClick={() => pickLetter(letter, index)}
          >
            {letter}
          </button>
        ))}
      </div>
      <p className="quest-hint">{completed ? englishData.sentence : hint}</p>
    </div>
  )
}

function MarketItemButton({
  item,
  selected,
  onToggle,
}: {
  item: MarketItem
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={selected ? 'shelf-item selected' : 'shelf-item'}
      onClick={onToggle}
    >
      <span>{item.icon}</span>
      <strong>{item.name}</strong>
      <small>{item.price} 元</small>
    </button>
  )
}

function ToyMarketQuest({
  task,
  completed,
  onComplete,
}: {
  task: LearningTask
  completed: boolean
  onComplete: (message: string) => void
}) {
  const math = task.math
  const [basket, setBasket] = useState<string[]>([])
  const [hint, setHint] = useState('把清单上的物品放进购物车。')

  useEffect(() => {
    setBasket([])
    setHint('把清单上的物品放进购物车。')
  }, [task.id])

  if (!math) {
    return null
  }

  const mathData = math
  const selectedItems = mathData.items.filter((item) => basket.includes(item.id))
  const total = selectedItems.reduce((sum, item) => sum + item.price, 0)
  const targetItems = mathData.items.filter((item) =>
    mathData.targetItemIds.includes(item.id),
  )
  const targetTotal = targetItems.reduce((sum, item) => sum + item.price, 0)

  function toggle(itemId: string) {
    if (completed) {
      return
    }

    setBasket((items) =>
      items.includes(itemId)
        ? items.filter((id) => id !== itemId)
        : [...items, itemId],
    )
  }

  function checkout() {
    if (completed) {
      return
    }

    if (sameItems(basket, mathData.targetItemIds) && total === targetTotal) {
      onComplete(`结账成功，一共 ${targetTotal} 元。`)
      return
    }

    if (total > mathData.budget) {
      setHint('购物车超预算了，拿出一件试试。')
      return
    }

    setHint('清单还没买齐，看看发光的目标。')
  }

  return (
    <div className="mini-game market-quest">
      <div className="shop-order">
        <div>
          <h2>{task.title}</h2>
          <p>{targetItems.map((item) => item.name).join(' + ')}</p>
        </div>
        <div className="price-badge">
          <Coins size={17} />
          <strong>{total}</strong>
          <span>/ {mathData.budget}</span>
        </div>
      </div>
      <div className="shelf-grid">
        {mathData.items.map((item) => (
          <MarketItemButton
            item={item}
            selected={basket.includes(item.id)}
            key={item.id}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>
      <button type="button" className="game-action" onClick={checkout}>
        <ShoppingCart size={18} />
        <span>{completed ? '已结账' : '推车结账'}</span>
      </button>
      <p className="quest-hint">{completed ? `刚好 ${targetTotal} 元。` : hint}</p>
    </div>
  )
}

function MiniGame({
  task,
  completed,
  onComplete,
}: {
  task: LearningTask
  completed: boolean
  onComplete: (message: string) => void
}) {
  if (task.mode === 'glyph') {
    return (
      <GlyphQuest task={task} completed={completed} onComplete={onComplete} />
    )
  }

  if (task.mode === 'treasure') {
    return (
      <WordTreasureQuest
        task={task}
        completed={completed}
        onComplete={onComplete}
      />
    )
  }

  return (
    <ToyMarketQuest task={task} completed={completed} onComplete={onComplete} />
  )
}

function App() {
  const [progress, setProgress] = useState<LearnerProgress>(createBlankProgress)
  const [activeSubject, setActiveSubject] = useState<SubjectId>('chinese')
  const [taskIndex, setTaskIndex] = useState(0)
  const [toast, setToast] = useState<Toast>({
    kind: 'guide',
    text: '点亮一个区域，开始今天的冒险。',
  })
  const [parentOpen, setParentOpen] = useState(false)
  const subjectTasks = useMemo(
    () => getSubjectTasks(activeSubject),
    [activeSubject],
  )
  const task = subjectTasks[taskIndex % subjectTasks.length]
  const completed = progress.completedTaskIds.includes(task.id)
  const dailyDone = getDailyTasks().filter((dailyTask) =>
    progress.completedTaskIds.includes(dailyTask.id),
  ).length

  useEffect(() => {
    let mounted = true
    void loadProgress().then((loadedProgress) => {
      if (mounted) {
        setProgress(loadedProgress)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setTaskIndex(0)
  }, [activeSubject])

  useEffect(() => {
    setToast({
      kind: completed ? 'win' : 'guide',
      text: completed
        ? '这个区域已经亮起来了，去下一关吧。'
        : subjects[activeSubject].promise,
    })
  }, [activeSubject, completed, task.id])

  async function completeQuest(message: string) {
    if (!progress.completedTaskIds.includes(task.id)) {
      const nextProgress = await recordTaskDone(
        progress,
        task.id,
        task.subject,
        task.reward,
      )
      setProgress(nextProgress)
    }

    setToast({ kind: 'win', text: message })
  }

  function pickZone(subject: SubjectId) {
    setActiveSubject(subject)
    setToast({ kind: 'guide', text: subjects[subject].promise })
  }

  function nextQuest() {
    setTaskIndex((index) => index + 1)
  }

  async function handleReset() {
    const blank = await resetProgress()
    setProgress(blank)
    setToast({ kind: 'guide', text: subjects[activeSubject].promise })
  }

  return (
    <main className={`game-screen ${activeSubject}`}>
      <img
        className="world-art"
        src="assets/rainbow-quest-world.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="world-shade" />
      <div className="spark-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <header className="game-hud" aria-label="游戏状态">
        <div className="player-chip">
          <div className="avatar-face">露</div>
          <div>
            <strong>彩虹任务岛</strong>
            <span>今日 {dailyDone}/3</span>
          </div>
        </div>
        <button
          type="button"
          className="hud-button"
          onClick={() => setParentOpen(true)}
        >
          <Home size={18} />
        </button>
      </header>

      <section className="zone-layer" aria-label="岛屿区域">
        {(Object.keys(subjects) as SubjectId[]).map((subject) => (
          <button
            type="button"
            className={
              subject === activeSubject ? `zone-pin ${subject} active` : `zone-pin ${subject}`
            }
            key={subject}
            onClick={() => pickZone(subject)}
          >
            <span>{zoneCopy[subject].marker}</span>
            <strong>{zoneCopy[subject].label}</strong>
          </button>
        ))}
      </section>

      <div className="companion" aria-hidden="true">
        <div className="companion-face">小露</div>
      </div>

      <section className="quest-dock" aria-label="当前关卡">
        <div className="dock-title">
          <div>
            <span>{subjects[activeSubject].name}</span>
            <h1>{task.title}</h1>
          </div>
          <div className="star-prize">+{task.reward}</div>
        </div>

        <MiniGame
          task={task}
          completed={completed}
          onComplete={(message) => void completeQuest(message)}
        />

        <div className={`toast ${toast.kind}`}>
          {toast.kind === 'win' ? <Check size={17} /> : <Sparkles size={17} />}
          <span>{toast.text}</span>
          {toast.kind === 'win' && (
            <button type="button" onClick={nextQuest}>
              <span>下一关</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </section>

      {parentOpen && (
        <ParentPanel
          progress={progress}
          onReset={() => void handleReset()}
          onClose={() => setParentOpen(false)}
        />
      )}
    </main>
  )
}

export default App
