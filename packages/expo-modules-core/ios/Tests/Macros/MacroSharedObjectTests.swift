// Copyright 2024-present 650 Industries. All rights reserved.

import Testing

@testable import ExpoModulesCore

// MARK: - Test shared object and module

@SharedObject
private final class MacroCounter: SharedObject {
  private var value: Int

  @JS
  init(value: Int) {
    self.value = value
  }

  @JS
  func increment(by amount: Int) -> Int {
    value += amount
    return value
  }

  @JS
  var current: Int {
    return value
  }
}

@SharedObject("RenamedCounter")
private final class MacroNamedCounter: SharedObject {
  @JS
  init(label: String) {}

  @JS
  func ping() -> String {
    return "pong"
  }
}

@ExpoModule(classes: [MacroCounter.self, MacroNamedCounter.self])
private final class MacroSharedObjectModule: Module {}

@Suite("Macro shared object")
@JavaScriptActor
private struct MacroSharedObjectTests {
  let appContext: AppContext
  var runtime: ExpoRuntime {
    get throws {
      try appContext.runtime
    }
  }

  init() {
    appContext = AppContext.create()
  }

  private func register(_ module: AnyModule) {
    // `name: nil` so module naming falls through to the macro-synthesized `_jsName`.
    appContext.moduleRegistry.register(module: module, name: nil)
  }

  // MARK: - Class exposure

  @Test
  func `class is exposed under the module by its name`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    #expect(try runtime.eval("typeof expo.modules.MacroSharedObjectModule.MacroCounter").asString() == "function")
  }

  @Test
  func `class name honors the @SharedObject argument`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    #expect(try runtime.eval("typeof expo.modules.MacroSharedObjectModule.RenamedCounter").asString() == "function")
    #expect(try runtime.eval("'MacroNamedCounter' in expo.modules.MacroSharedObjectModule").asBool() == false)
  }

  // MARK: - Construction

  @Test
  func `@JS init constructs the instance from JS arguments`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    let value = try runtime.eval([
      "object = new expo.modules.MacroSharedObjectModule.MacroCounter(7)",
      "object.current"
    ].joined(separator: "\n"))
    #expect(try value.asInt() == 7)
  }

  // MARK: - @JS methods

  @Test
  func `binds a @JS method on the prototype, unwrapping the receiver`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    let value = try runtime.eval([
      "object = new expo.modules.MacroSharedObjectModule.MacroCounter(10)",
      "object.increment(5)"
    ].joined(separator: "\n"))
    #expect(try value.asInt() == 15)
  }

  @Test
  func `method mutates the paired native instance across calls`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    let value = try runtime.eval([
      "object = new expo.modules.MacroSharedObjectModule.MacroCounter(0)",
      "object.increment(1)",
      "object.increment(2)",
      "object.increment(3)"
    ].joined(separator: "\n"))
    #expect(try value.asInt() == 6)
  }

  @Test
  func `honors the @SharedObject name override on a bound method`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    #expect(try runtime.eval("new expo.modules.MacroSharedObjectModule.RenamedCounter('x').ping()").asString() == "pong")
  }

  // MARK: - @JS properties

  @Test
  func `binds a @JS property on the prototype`() throws {
    register(MacroSharedObjectModule(appContext: appContext))
    let value = try runtime.eval([
      "object = new expo.modules.MacroSharedObjectModule.MacroCounter(42)",
      "object.current"
    ].joined(separator: "\n"))
    #expect(try value.asInt() == 42)
  }
}
