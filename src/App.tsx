import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronRight,
  Coins,
  Gem,
  Home,
  Paintbrush,
  RotateCcw,
  Scroll,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
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
import { HanziPractice } from './components/HanziPractice'
import { IslandMap } from './components/IslandMap'
import {
  createBlankProgress,
  loadProgress,
  recordTaskDone,
  resetProgress,
  type LearnerProgress,
} from './storage'

type Feedback = {
  kind: 'idle' | 'correct' | 'try-again'
  text: string
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
}: {
  progress: LearnerProgress
  onReset: () => void
}) {
  const totalDone = progress.completedTaskIds.length

  return (
    <section className="parent-panel" aria-label="家长面板">
      <div className="panel-heading">
        <ShieldCheck size={19} />
        <h2>家长面板</h2>
      </div>
      <div className="parent-grid">
        <div>
          <span className="metric">{progress.stars}</span>
          <small>星星</small>
        </div>
        <div>
          <span className="metric">{progress.streakDays}</span>
          <small>连续天数</small>
        </div>
        <div>
          <span className="metric">{totalDone}</span>
          <small>完成任务</small>
        </div>
      </div>
      <p className="parent-note">
        建议每天 8-12 分钟。进度只保存在本机，不上传孩子数据。
      </p>
      <button type="button" className="secondary-button" onClick={onReset}>
        <RotateCcw size={17} />
        <span>重置进度</span>
      </button>
    </section>
  )
}

function PictographWorkshop({
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
  const isLastStep = step === glyphData.steps.length - 1

  function advance() {
    if (isLastStep) {
      onComplete(`你把${glyphData.objectName}变成了“${glyphData.character}”。`)
      return
    }

    setStep((currentStep) => currentStep + 1)
  }

  return (
    <section className="glyph-game" aria-label={`${glyphData.character} 造字游戏`}>
      <div className="craft-board">
        <div>
          <span className="mini-label">{current.title}</span>
          <h3>{current.text}</h3>
        </div>
        <button
          type="button"
          className="primary-action"
          onClick={advance}
          disabled={completed}
        >
          <Paintbrush size={18} />
          <span>{completed ? '已刻好' : current.action}</span>
        </button>
      </div>

      <div className={`glyph-scene ${glyphData.scene}`}>
        <div className="sky-line">
          <span>{glyphData.objectName}</span>
          <strong>{current.shape}</strong>
        </div>
        <div className="oracle-tablet">
          <Scroll size={18} />
          <p>{glyphData.craftLine}</p>
        </div>
      </div>

      <div className="glyph-steps">
        {glyphData.steps.map((glyphStep, index) => (
          <div
            className={index <= step ? 'glyph-step active' : 'glyph-step'}
            key={glyphStep.title}
          >
            <span>{glyphStep.shape}</span>
            <small>{glyphStep.title}</small>
          </div>
        ))}
      </div>

      <div className="hanzi-wrap">
        <HanziPractice character={glyphData.character} />
      </div>
    </section>
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
  const [localHint, setLocalHint] = useState('宝箱在等正确的字母顺序。')

  useEffect(() => {
    setPickedLetters([])
    setPickedIndexes([])
    setLocalHint('宝箱在等正确的字母顺序。')
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
      setLocalHint(`这颗 ${letter.toUpperCase()} 宝石还没到位置。`)
      return
    }

    const nextLetters = [...pickedLetters, letter]
    const nextIndexes = [...pickedIndexes, index]
    setPickedLetters(nextLetters)
    setPickedIndexes(nextIndexes)
    setLocalHint('字母宝石正在发光。')

    if (nextLetters.join('') === englishData.word) {
      speak(englishData.sentence, 'en-US')
      onComplete(`你打开了${englishData.treasure}。`)
    }
  }

  return (
    <section className="treasure-game" aria-label={`${englishData.word} 拼词寻宝`}>
      <div className={completed ? 'treasure-chest open' : 'treasure-chest'}>
        <Gem size={32} />
        <div>
          <span>宝藏线索</span>
          <strong>{englishData.clue}</strong>
          <small>{englishData.meaning}</small>
        </div>
        <button
          type="button"
          className="listen-button"
          onClick={() => speak(englishData.sound, 'en-US')}
        >
          <Volume2 size={20} />
        </button>
      </div>

      <div className="word-slots">
        {englishData.word.split('').map((letter, index) => (
          <span className="word-slot" key={`${letter}-${index}`}>
            {pickedLetters[index] ?? ''}
          </span>
        ))}
      </div>

      <div className="letter-bank">
        {englishData.letters.map((letter, index) => (
          <button
            type="button"
            className={
              pickedIndexes.includes(index) ? 'letter-stone used' : 'letter-stone'
            }
            key={`${letter}-${index}`}
            onClick={() => pickLetter(letter, index)}
          >
            {letter}
          </button>
        ))}
      </div>

      <p className="local-hint">{completed ? englishData.sentence : localHint}</p>
    </section>
  )
}

function MarketShelf({
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
      className={selected ? 'market-item selected' : 'market-item'}
      onClick={onToggle}
    >
      <span className="item-icon">{item.icon}</span>
      <strong>{item.name}</strong>
      <small>{item.price} 元</small>
    </button>
  )
}

function ToyMarketGame({
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
  const [shopHint, setShopHint] = useState('把清单上的物品放进购物篮。')

  useEffect(() => {
    setBasket([])
    setShopHint('把清单上的物品放进购物篮。')
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
  const overBudget = total > mathData.budget

  function toggleItem(itemId: string) {
    if (completed) {
      return
    }

    setBasket((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    )
  }

  function checkout() {
    if (sameItems(basket, mathData.targetItemIds) && total === targetTotal) {
      onComplete(`结账成功，一共 ${targetTotal} 元。`)
      return
    }

    if (overBudget) {
      setShopHint('购物篮超预算了，先拿出一件试试。')
      return
    }

    setShopHint('清单还没买对，看看需要哪些物品。')
  }

  return (
    <section className="market-game" aria-label={`${mathData.shopName} 购物游戏`}>
      <div className="shop-window">
        <Store size={24} />
        <div>
          <span>{mathData.shopName}</span>
          <strong>{mathData.story}</strong>
        </div>
      </div>

      <div className="shopping-list">
        <span>购物清单</span>
        <strong>{targetItems.map((item) => item.name).join(' + ')}</strong>
        <small>预算 {mathData.budget} 元</small>
      </div>

      <div className="market-grid">
        {mathData.items.map((item) => (
          <MarketShelf
            item={item}
            selected={basket.includes(item.id)}
            key={item.id}
            onToggle={() => toggleItem(item.id)}
          />
        ))}
      </div>

      <div className="checkout-line">
        <div className="coin-board" aria-label={`当前总价 ${total} 元`}>
          <Coins size={18} />
          <strong>{total} 元</strong>
          <span className={overBudget ? 'budget over' : 'budget'}>
            / {mathData.budget} 元
          </span>
        </div>
        <button type="button" className="primary-action" onClick={checkout}>
          <ShoppingCart size={18} />
          <span>{completed ? '已结账' : '去结账'}</span>
        </button>
      </div>

      <div className="coin-row">
        {mathData.coins.map((_, index) => (
          <span className={index < total ? 'coin active' : 'coin'} key={index}>
            1
          </span>
        ))}
      </div>

      <p className="local-hint">{completed ? `刚好 ${targetTotal} 元。` : shopHint}</p>
    </section>
  )
}

function LearningScene({
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
      <PictographWorkshop
        task={task}
        completed={completed}
        onComplete={onComplete}
      />
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
    <ToyMarketGame task={task} completed={completed} onComplete={onComplete} />
  )
}

function App() {
  const [progress, setProgress] = useState<LearnerProgress>(createBlankProgress)
  const [activeSubject, setActiveSubject] = useState<SubjectId>('chinese')
  const [taskIndex, setTaskIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({
    kind: 'idle',
    text: '从地图上选一站，开始今天的任务。',
  })
  const [parentOpen, setParentOpen] = useState(false)
  const subjectTasks = useMemo(
    () => getSubjectTasks(activeSubject),
    [activeSubject],
  )
  const task = subjectTasks[taskIndex % subjectTasks.length]
  const activeMeta = subjects[activeSubject]
  const dailyTasks = getDailyTasks()
  const dailyDone = dailyTasks.filter((dailyTask) =>
    progress.completedTaskIds.includes(dailyTask.id),
  ).length
  const completed = progress.completedTaskIds.includes(task.id)

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
    setFeedback({
      kind: completed ? 'correct' : 'idle',
      text: completed ? '这一站已经点亮，可以继续下一站。' : activeMeta.promise,
    })
  }, [activeMeta.promise, completed, task.id])

  async function handleComplete(message: string) {
    if (progress.completedTaskIds.includes(task.id)) {
      setFeedback({ kind: 'correct', text: message })
      return
    }

    const nextProgress = await recordTaskDone(
      progress,
      task.id,
      task.subject,
      task.reward,
    )
    setProgress(nextProgress)
    setFeedback({ kind: 'correct', text: message })
  }

  function nextTask() {
    setTaskIndex((current) => current + 1)
  }

  async function handleReset() {
    const blank = await resetProgress()
    setProgress(blank)
    setFeedback({ kind: 'idle', text: activeMeta.promise })
  }

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="当前状态">
        <div className="brand-mark">
          <Sparkles size={20} />
          <span>彩虹任务岛</span>
        </div>
        <button
          type="button"
          className="parent-toggle"
          onClick={() => setParentOpen((open) => !open)}
        >
          <Home size={18} />
          <span>家长</span>
        </button>
      </section>

      <section className="hero-band" aria-label="今日任务">
        <div className="mission-copy">
          <span className="eyebrow">今日 {dailyDone}/3</span>
          <h1>{activeMeta.place}</h1>
          <p>{activeMeta.promise}</p>
        </div>
        <div className="pet-badge" aria-label={`宠物等级 ${progress.petLevel}`}>
          <span>Lv.{progress.petLevel}</span>
          <strong>{progress.petName}</strong>
        </div>
      </section>

      <IslandMap
        activeSubject={activeSubject}
        progress={progress}
        onSelectSubject={setActiveSubject}
      />

      <section className="subject-tabs" aria-label="学科选择">
        {(Object.keys(subjects) as SubjectId[]).map((subject) => (
          <button
            type="button"
            key={subject}
            className={subject === activeSubject ? 'tab active' : 'tab'}
            onClick={() => setActiveSubject(subject)}
          >
            {subjects[subject].shortName}
          </button>
        ))}
      </section>

      <section className={`task-card ${task.mode}`} aria-live="polite">
        <div className="task-head">
          <div>
            <span className="subject-pill">{activeMeta.name}</span>
            <h2>{task.title}</h2>
          </div>
          <div className="reward-chip">+{task.reward}</div>
        </div>

        <div className="prompt-box">
          <BookOpen size={18} />
          <p>{task.prompt}</p>
        </div>

        <LearningScene
          task={task}
          completed={completed}
          onComplete={(message) => void handleComplete(message)}
        />

        <div className={`feedback ${feedback.kind}`}>
          {feedback.kind === 'correct' ? <Check size={18} /> : <Sparkles size={18} />}
          <span>{feedback.text}</span>
          {feedback.kind === 'correct' && (
            <button type="button" onClick={nextTask}>
              <span>下一站</span>
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      </section>

      {parentOpen && <ParentPanel progress={progress} onReset={handleReset} />}
    </main>
  )
}

export default App
