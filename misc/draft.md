TODOs in 1.0.6
----

  * BUG: plugin 開啟檔案位置時，C:\xxx\abc.mp4會無法開啟，C:/xxx\abc.mp4則沒問題。
         (不確定此問題，需測試確定才修改。)
  * NEW: Search功能   (PS: 有想要做，還再構想操作流程)
  * NEW: 畫質下載選擇，能讓使用者選擇是否要下載高畫質or低畫質時強制下載。
         (出現403 forbidden問題，待測試。BUT 在自己寫的python script可以避開403，大概是要load一次動畫原始頁面取得最新的cookie吧。)
  * NEW: Tag manage. 目前有儲存部分影片相關資訊，TAG尚未紀錄&附加應用。
  * ... ??? (想到就會加入)
  
  
Finished in 1.0.5
---

  * 影片刪除後，數量錯誤
  * 新增編輯功能 (PS: 主要是影片位置改變後，提供修改的功能)
  * 加入自動更新套件功能
  * 增加選單項目 (PS: 能選擇是否覆蓋一張...阿~ 是檔案已經存在時，是否要另存新檔)
  