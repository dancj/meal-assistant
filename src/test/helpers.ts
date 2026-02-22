export function createSupabaseMock() {
  let _data: unknown = null;
  let _error: unknown = null;

  const mock: Record<string, ReturnType<typeof vi.fn>> = {};

  function setupChaining() {
    const chain = () => mock;
    mock.from.mockImplementation(chain);
    mock.select.mockImplementation(chain);
    mock.insert.mockImplementation(chain);
    mock.update.mockImplementation(chain);
    mock.delete.mockImplementation(chain);
    mock.eq.mockImplementation(chain);
    mock.order.mockImplementation(chain);
    mock.single.mockImplementation(chain);
    mock.then.mockImplementation(
      (resolve: (value: { data: unknown; error: unknown }) => void) =>
        resolve({ data: _data, error: _error })
    );
  }

  mock.from = vi.fn();
  mock.select = vi.fn();
  mock.insert = vi.fn();
  mock.update = vi.fn();
  mock.delete = vi.fn();
  mock.eq = vi.fn();
  mock.order = vi.fn();
  mock.single = vi.fn();
  mock.then = vi.fn();

  setupChaining();

  return {
    mock,
    resolveWith(data: unknown, error: unknown = null) {
      _data = data;
      _error = error;
    },
    reset() {
      _data = null;
      _error = null;
      for (const fn of Object.values(mock)) {
        fn.mockClear();
      }
      setupChaining();
    },
  };
}
