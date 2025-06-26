client<llm> GLM4Plus {
  provider openai-generic
  options {
    model "glm-4-plus"
    api_key env.GLM_API_KEY
    base_url "https://open.bigmodel.cn/api/paas/v4"
    retry_policy GLMRetry
  }
}

client<llm> QiniuDeepseekV3 {
  provider openai-generic
  options {
    model "deepseek-v3"
    api_key env.QINIU_DEEPSEEK_FREE_API_KEY
    base_url "https://api.qnaigc.com/v1"
  }
}