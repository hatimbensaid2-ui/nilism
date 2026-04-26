export function computeTotals(onMe, onOthers) {
  const sumBenefit = (rows) => rows.reduce((s, r) => s + (r.benefit || 0) * (r.weight || 1), 0)
  const sumHarm = (rows) => rows.reduce((s, r) => s + (r.harm || 0) * (r.weight || 1), 0)

  const onMeBenefit = sumBenefit(onMe)
  const onMeHarm = sumHarm(onMe)
  const onOthersBenefit = sumBenefit(onOthers)
  const onOthersHarm = sumHarm(onOthers)

  const totalBenefit = onMeBenefit + onOthersBenefit
  const totalHarm = onMeHarm + onOthersHarm
  const net = totalBenefit - totalHarm
  const meNet = onMeBenefit - onMeHarm
  const othersNet = onOthersBenefit - onOthersHarm

  return { onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm, totalBenefit, totalHarm, net, meNet, othersNet }
}

export function getRecommendation(totals, decisionName) {
  const { totalBenefit, totalHarm, net, meNet, othersNet } = totals
  const name = decisionName?.trim() || 'this decision'

  if (totalBenefit === 0 && totalHarm === 0) {
    return {
      verdict: 'empty',
      title: 'Fill in your evaluation',
      subtitle: 'Rate the benefits and harms to get your recommendation',
      reasons: [],
      quote: 'كن صيادًا للحظات السعادة — Be a hunter of happy moments',
      color: 'slate',
    }
  }

  const ratio = totalHarm === 0 ? Infinity : totalBenefit / totalHarm
  const reasons = buildReasons(totals, name)
  const quadrant = getQuadrant(meNet, othersNet)

  if (net === 0) {
    return {
      verdict: 'neutral',
      title: 'Balanced',
      subtitle: `The scales are perfectly even for "${name}" — follow your intuition`,
      reasons,
      quote: 'The scales are even. Only your heart knows the true weight.',
      quadrant,
      color: 'amber',
    }
  }

  if (net > 0) {
    if (ratio >= 3) {
      return {
        verdict: 'strongly-yes',
        title: 'Strongly Recommended',
        subtitle: `Go for it — the benefits of "${name}" vastly outweigh the harms`,
        reasons,
        quote: 'كن صيادًا للحظات السعادة — Be a hunter of happy moments',
        quadrant,
        color: 'emerald',
      }
    }
    return {
      verdict: 'yes',
      title: 'Recommended',
      subtitle: `The benefits of "${name}" outweigh the harms`,
      reasons,
      quote: 'A life examined is a life well-chosen.',
      quadrant,
      color: 'green',
    }
  }

  if (ratio <= 0.33) {
    return {
      verdict: 'strongly-no',
      title: 'Strongly Not Recommended',
      subtitle: `Avoid "${name}" — the harms vastly outweigh the benefits`,
      reasons,
      quote: 'Wisdom is knowing which battles not to fight.',
      quadrant,
      color: 'red',
    }
  }
  return {
    verdict: 'no',
    title: 'Not Recommended',
    subtitle: `The harms of "${name}" outweigh the benefits`,
    reasons,
    quote: "Sometimes the bravest choice is the one you don't make.",
    quadrant,
    color: 'orange',
  }
}

function getQuadrant(meNet, othersNet) {
  if (meNet >= 0 && othersNet >= 0) return { label: 'Win-Win', color: 'emerald', desc: 'Good for you and for others' }
  if (meNet >= 0 && othersNet < 0) return { label: 'Selfish Gain', color: 'yellow', desc: 'Good for you, but harms others' }
  if (meNet < 0 && othersNet >= 0) return { label: 'Selfless', color: 'blue', desc: 'Costs you, but benefits others' }
  return { label: 'Lose-Lose', color: 'red', desc: 'Bad for both you and others' }
}

function buildReasons({ totalBenefit, totalHarm, onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm, net, meNet, othersNet }) {
  const reasons = []

  if (meNet > 0) {
    reasons.push({ type: 'positive', text: `Personally beneficial — net +${meNet} on you (${onMeBenefit} benefit vs ${onMeHarm} harm)` })
  } else if (meNet < 0) {
    reasons.push({ type: 'negative', text: `Personally costly — net ${meNet} on you (${onMeHarm} harm vs ${onMeBenefit} benefit)` })
  } else if (onMeBenefit > 0) {
    reasons.push({ type: 'neutral', text: `Personally neutral — equal benefit and harm on you (${onMeBenefit} each)` })
  }

  if (othersNet > 0) {
    reasons.push({ type: 'positive', text: `Helps others — net +${othersNet} on others (${onOthersBenefit} benefit vs ${onOthersHarm} harm)` })
  } else if (othersNet < 0) {
    reasons.push({ type: 'negative', text: `Hurts others — net ${othersNet} on others (${onOthersHarm} harm vs ${onOthersBenefit} benefit)` })
  } else if (onOthersBenefit === 0 && onOthersHarm === 0) {
    reasons.push({ type: 'neutral', text: 'No significant impact on others' })
  }

  if (Math.abs(net) > 0) {
    reasons.push({
      type: net > 0 ? 'positive' : 'negative',
      text: `Net score ${net > 0 ? '+' : ''}${net} — ${net > 0 ? 'more good than harm overall' : 'more harm than good overall'}`,
    })
  }

  if (onOthersHarm === 0 && onOthersBenefit > 0 && net > 0) {
    reasons.push({ type: 'positive', text: 'Ethically sound — benefits others without causing any harm to them' })
  }
  if (onOthersHarm > 0 && meNet > 0) {
    reasons.push({ type: 'negative', text: 'Ethical caution — your gain comes at a cost to others' })
  }

  return reasons
}

// Encode state to URL-safe base64
export function encodeState(state) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(state)))
  } catch {
    return ''
  }
}

// Decode state from URL hash
export function decodeState(hash) {
  try {
    return JSON.parse(decodeURIComponent(atob(hash)))
  } catch {
    return null
  }
}
