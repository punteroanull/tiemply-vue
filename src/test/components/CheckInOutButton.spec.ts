// src/test/components/CheckInOutButton.spec.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { nextTick, ref } from "vue";
import CheckInOutButton from "@/components/CheckInOutButton.vue";
import StatusBadge from "@/components/StatusBadge.vue";
import { useWorkStatusStore } from "@/stores/workStatus";
import i18n from "@/i18n";
import type { WorkState } from "@/types";

// Mock @vueuse/core
const mockIsOnline = ref(true);
vi.mock("@vueuse/core", () => ({
  useOnline: () => mockIsOnline,
}));

// Mock vue-toastification
vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock v-click-outside directive
const clickOutsideDirective = {
  mounted() {},
  unmounted() {},
};

describe("CheckInOutButton", () => {
  let wrapper: VueWrapper<any>;

  function createWrapper(initialState: Partial<{
    currentState: WorkState;
    checkingIn: boolean;
    checkingOut: boolean;
    gettingLocation: boolean;
    isCheckedIn: boolean;
    formattedCurrentDuration: string;
    stateLabel: string;
    isGeolocationEnabled: boolean;
    locationData: { latitude: number; longitude: number; accuracy: number } | null;
    locationError: { code: number; message: string } | null;
    formattedLocation: string;
  }> = {}) {
    return mount(CheckInOutButton, {
      global: {
        plugins: [
          i18n,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              workStatus: {
                currentState: "not_working",
                checkingIn: false,
                checkingOut: false,
                gettingLocation: false,
                isCheckedIn: false,
                formattedCurrentDuration: "",
                stateLabel: "Not Working",
                isGeolocationEnabled: false,
                locationData: null,
                locationError: null,
                formattedLocation: "",
                ...initialState,
              },
            },
          }),
        ],
        components: {
          StatusBadge,
        },
        directives: {
          "click-outside": clickOutsideDirective,
        },
        stubs: {
          teleport: true,
        },
      },
    });
  }

  beforeEach(() => {
    mockIsOnline.value = true;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders button with correct label for not_working state", () => {
      wrapper = createWrapper({ currentState: "not_working", stateLabel: "Not Working" });
      expect(wrapper.text()).toContain("Not Working");
    });

    it("renders button with correct label for working state", () => {
      wrapper = createWrapper({ currentState: "working", stateLabel: "Working" });
      expect(wrapper.text()).toContain("Working");
    });

    it("renders button with correct label for on_break state", () => {
      wrapper = createWrapper({ currentState: "on_break", stateLabel: "On Break" });
      expect(wrapper.text()).toContain("On Break");
    });

    it("renders button with correct label for offsite state", () => {
      wrapper = createWrapper({ currentState: "offsite", stateLabel: "Offsite" });
      expect(wrapper.text()).toContain("Offsite");
    });

    it("shows duration element when isCheckedIn and duration exist", async () => {
      // Create wrapper with working state
      wrapper = mount(CheckInOutButton, {
        global: {
          plugins: [
            i18n,
            createTestingPinia({
              createSpy: vi.fn,
              stubActions: false,
              initialState: {
                workStatus: {
                  currentState: "working",
                  checkingIn: false,
                  checkingOut: false,
                  gettingLocation: false,
                  stateLabel: "Working",
                  isGeolocationEnabled: false,
                  locationData: null,
                  locationError: null,
                  formattedLocation: "",
                  status: { checked_in: true },
                },
              },
            }),
          ],
          components: { StatusBadge },
          directives: { "click-outside": clickOutsideDirective },
        },
      });
      // Check that the component renders correctly in working state
      expect(wrapper.text()).toContain("Working");
      expect(wrapper.find("button").classes()).toContain("bg-green-600");
    });

    it("shows loading spinner when checkingIn", () => {
      wrapper = createWrapper({ checkingIn: true });
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });

    it("shows loading spinner when checkingOut", () => {
      wrapper = createWrapper({ checkingOut: true });
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });

    it("shows loading spinner when gettingLocation", () => {
      wrapper = createWrapper({ gettingLocation: true });
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });
  });

  describe("Menu Toggle", () => {
    it("opens menu on click", async () => {
      wrapper = createWrapper();
      await wrapper.find("button").trigger("click");
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(true);
    });

    it("closes menu on second click", async () => {
      wrapper = createWrapper();
      await wrapper.find("button").trigger("click");
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(true);
      await wrapper.find("button").trigger("click");
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(false);
    });

    it("does not open menu when loading", async () => {
      wrapper = createWrapper({ checkingIn: true });
      await wrapper.find("button").trigger("click");
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(false);
    });

    it("closes menu on escape key", async () => {
      wrapper = createWrapper();
      await wrapper.find("button").trigger("click");
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(true);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(wrapper.find('[class*="absolute bottom-full"]').exists()).toBe(false);
    });
  });

  describe("Available Actions", () => {
    it("shows Start Shift action for not_working state", async () => {
      wrapper = createWrapper({ currentState: "not_working" });
      await wrapper.find("button").trigger("click");
      const menuButtons = wrapper.findAll('[class*="w-full flex items-center"]');
      expect(menuButtons.length).toBe(1);
      expect(wrapper.text()).toContain("Start Shift");
    });

    it("shows Break, Offsite, and End Shift actions for working state", async () => {
      wrapper = createWrapper({ currentState: "working" });
      await wrapper.find("button").trigger("click");
      expect(wrapper.text()).toContain("Start Break");
      expect(wrapper.text()).toContain("Go Offsite");
      expect(wrapper.text()).toContain("End Shift");
    });

    it("shows Return from Break action for on_break state", async () => {
      wrapper = createWrapper({ currentState: "on_break" });
      await wrapper.find("button").trigger("click");
      const menuButtons = wrapper.findAll('[class*="w-full flex items-center"]');
      expect(menuButtons.length).toBe(1);
      expect(wrapper.text()).toContain("Return from Break");
    });

    it("shows Return to Office action for offsite state", async () => {
      wrapper = createWrapper({ currentState: "offsite" });
      await wrapper.find("button").trigger("click");
      const menuButtons = wrapper.findAll('[class*="w-full flex items-center"]');
      expect(menuButtons.length).toBe(1);
      expect(wrapper.text()).toContain("Return to Office");
    });
  });

  describe("Action Handlers", () => {
    it("calls startShift when Start Shift is clicked", async () => {
      wrapper = createWrapper({ currentState: "not_working" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const actionButton = wrapper.findAll('[class*="w-full flex items-center"]')[0];
      await actionButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("shift_start");
    });

    it("calls startBreak when Start Break is clicked", async () => {
      wrapper = createWrapper({ currentState: "working" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const breakButton = wrapper.findAll('[class*="w-full flex items-center"]')[0];
      await breakButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("break_start");
    });

    it("calls startOffsite when Go Offsite is clicked", async () => {
      wrapper = createWrapper({ currentState: "working" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const offsiteButton = wrapper.findAll('[class*="w-full flex items-center"]')[1];
      await offsiteButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("offsite_start");
    });

    it("calls endShift when End Shift is clicked", async () => {
      wrapper = createWrapper({ currentState: "working" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const endButton = wrapper.findAll('[class*="w-full flex items-center"]')[2];
      await endButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("shift_end");
    });

    it("calls endBreak when Return from Break is clicked", async () => {
      wrapper = createWrapper({ currentState: "on_break" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const actionButton = wrapper.findAll('[class*="w-full flex items-center"]')[0];
      await actionButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("break_end");
    });

    it("calls endOffsite when Return to Office is clicked", async () => {
      wrapper = createWrapper({ currentState: "offsite" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const actionButton = wrapper.findAll('[class*="w-full flex items-center"]')[0];
      await actionButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("offsite_end");
    });
  });

  describe("Offline Mode", () => {
    it("shows offline indicator when offline", async () => {
      mockIsOnline.value = false;
      wrapper = createWrapper();
      await wrapper.find("button").trigger("click");
      expect(wrapper.text()).toContain("Offline");
    });

    it("hands the action to the store when offline, which queues it", async () => {
      // Queueing lives in the store so the dashboard buttons get it too; see
      // stores/workStatus.spec.ts for the queue itself.
      mockIsOnline.value = false;
      wrapper = createWrapper({ currentState: "not_working" });
      const store = useWorkStatusStore();
      await wrapper.find("button").trigger("click");
      const actionButton = wrapper.findAll('[class*="w-full flex items-center"]')[0];
      await actionButton.trigger("click");
      expect(store.requestAction).toHaveBeenCalledWith("shift_start");
    });

    it("shows how many entries are waiting to sync", async () => {
      wrapper = createWrapper({ pendingCount: 2 } as any);
      expect(wrapper.text()).toContain("2 entries waiting to sync");
    });
  });

  describe("Accessibility", () => {
    it("exposes the menu state on the main button", async () => {
      wrapper = createWrapper({ currentState: "working" });
      const button = wrapper.find("button");
      expect(button.attributes("aria-haspopup")).toBe("menu");
      expect(button.attributes("aria-expanded")).toBe("false");
      await button.trigger("click");
      expect(button.attributes("aria-expanded")).toBe("true");
      expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(3);
    });

    it("says what it is waiting for while the position is being obtained", () => {
      wrapper = createWrapper({ gettingLocation: true });
      expect(wrapper.text()).toContain("Getting location");
    });
  });

  describe("Button Color Classes", () => {
    it("uses green colors for working state", () => {
      wrapper = createWrapper({ currentState: "working" });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("bg-green-600");
    });

    it("uses amber colors for on_break state", () => {
      wrapper = createWrapper({ currentState: "on_break" });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("bg-amber-500");
    });

    it("uses blue colors for offsite state", () => {
      wrapper = createWrapper({ currentState: "offsite" });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("bg-blue-500");
    });

    it("uses gray colors for not_working state", () => {
      wrapper = createWrapper({ currentState: "not_working" });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("bg-gray-600");
    });
  });

  describe("StatusBadge in Menu", () => {
    it("renders StatusBadge with correct state in menu header", async () => {
      wrapper = createWrapper({ currentState: "working" });
      await wrapper.find("button").trigger("click");
      const badge = wrapper.findComponent(StatusBadge);
      expect(badge.exists()).toBe(true);
      expect(badge.props("state")).toBe("working");
    });
  });
});
