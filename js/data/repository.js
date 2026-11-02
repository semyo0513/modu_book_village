/**
 * 데이터 저장소 인터페이스 (Repository Pattern)
 * - FirebaseRepo 또는 MockRepo를 투명하게 주입하여 UI 코드와 DB 결합도를 분리
 */

export const Repository = {
  instance: null,

  setImplementation(repo) {
    this.instance = repo;
  },

  get() {
    if (!this.instance) {
      throw new Error("Repository 구현체가 설정되지 않았습니다.");
    }
    return this.instance;
  }
};
