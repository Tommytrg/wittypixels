import NodeCache from 'node-cache'

export class TimeCache {
  cache: NodeCache

  constructor() {
    this.cache = new NodeCache({ stdTTL: 3, checkperiod: 4 })
  }

  public add(data: string) {
    this.cache.set(data, Date.now())
  }

  isValid(data: string): boolean {
    return !this.cache.has(data)
  }
}
