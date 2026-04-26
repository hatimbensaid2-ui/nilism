export function computeTotals(state) {
  const onMeBenefit = (state.onMe.moral.benefit || 0) + (state.onMe.material.benefit || 0)
  const onMeHarm = (state.onMe.moral.harm || 0) + (state.onMe.material.harm || 0)
  const onOthersBenefit = (state.onOthers.moral.benefit || 0) + (state.onOthers.material.benefit || 0)
  const onOthersHarm = (state.onOthers.moral.harm || 0) + (state.onOthers.material.harm || 0)

  const totalBenefit = onMeBenefit + onOthersBenefit
  const totalHarm = onMeHarm + onOthersHarm
  const net = totalBenefit - totalHarm

  return { onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm, totalBenefit, totalHarm, net }
}

export function getRecommendation(totals, decisionName) {
  const { totalBenefit, totalHarm, onMeHarm, onOthersBenefit, onOthersHarm, net } = totals
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

  if (net === 0) {
    return {
      verdict: 'neutral',
      title: 'Balanced',
      subtitle: 'Benefits and harms are equal — follow your intuition',
      reasons,
      quote: 'The scales are even. Only your heart knows the true weight.',
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
        color: 'emerald',
      }
    }
    return {
      verdict: 'yes',
      title: 'Recommended',
      subtitle: `The benefits of "${name}" outweigh the harms`,
      reasons,
      quote: 'A life examined is a life well-chosen.',
      color: 'green',
    }
  }

  // net < 0
  if (ratio <= 0.33) {
    return {
      verdict: 'strongly-no',
      title: 'Strongly Not Recommended',
      subtitle: `Avoid "${name}" — the harms vastly outweigh the benefits`,
      reasons,
      quote: 'Wisdom is knowing which battles not to fight.',
      color: 'red',
    }
  }
  return {
    verdict: 'no',
    title: 'Not Recommended',
    subtitle: `The harms of "${name}" outweigh the benefits`,
    reasons,
    quote: 'Sometimes the bravest choice is the one you don\'t make.',
    color: 'orange',
  }
}

function buildReasons({ totalBenefit, totalHarm, onMeBenefit, onMeHarm, onOthersBenefit, onOthersHarm, net }, name) {
  const reasons = []

  if (onMeBenefit > onMeHarm) {
    reasons.push({ type: 'positive', text: `Personally beneficial — ${onMeBenefit} benefit vs ${onMeHarm} harm on you` })
  } else if (onMeHarm > onMeBenefit) {
    reasons.push({ type: 'negative', text: `Personally costly — ${onMeHarm} harm vs ${onMeBenefit} benefit on you` })
  } else if (onMeBenefit > 0) {
    reasons.push({ type: 'neutral', text: `Personally neutral — equal benefit and harm on you (${onMeBenefit} each)` })
  }

  if (onOthersBenefit > onOthersHarm) {
    reasons.push({ type: 'positive', text: `Helps others — ${onOthersBenefit} benefit vs ${onOthersHarm} harm on others` })
  } else if (onOthersHarm > onOthersBenefit) {
    reasons.push({ type: 'negative', text: `Hurts others — ${onOthersHarm} harm vs ${onOthersBenefit} benefit on others` })
  } else if (onOthersHarm === 0 && onOthersBenefit === 0) {
    reasons.push({ type: 'neutral', text: 'No significant impact on others' })
  }

  const absNet = Math.abs(net)
  if (absNet > 0) {
    reasons.push({
      type: net > 0 ? 'positive' : 'negative',
      text: `Net score of ${net > 0 ? '+' : ''}${net} — ${net > 0 ? 'more good than harm' : 'more harm than good'}`,
    })
  }

  if (onOthersHarm === 0 && onOthersBenefit > 0 && net > 0) {
    reasons.push({ type: 'positive', text: 'Ethically sound — benefits others without causing harm' })
  }
  if (onOthersHarm > 0 && net < 0) {
    reasons.push({ type: 'negative', text: 'Ethically concerning — causes harm to others' })
  }

  return reasons
}
