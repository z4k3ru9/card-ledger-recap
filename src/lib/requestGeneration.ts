/**
 * Small lifetime guard for async loads. A completion is accepted only when it
 * belongs to the latest generation and the owner has not been disposed.
 */
export class RequestGeneration {
  private generation = 0
  private disposed = false

  begin(): number {
    if (this.disposed) return -1
    this.generation += 1
    return this.generation
  }

  isCurrent(generation: number): boolean {
    return !this.disposed && generation === this.generation
  }

  dispose(): void {
    this.disposed = true
    this.generation += 1
  }
}
