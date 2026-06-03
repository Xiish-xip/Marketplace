import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import { MessageSquare, CheckCircle, Send } from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';

export default function SellerQA() {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller', 'qa', filter],
    queryFn: () => get('/products/questions/seller', { status: filter || undefined }),
  });

  const questions = data?.data || [];

  if (isLoading) return <SkeletonPage cards={4} columns={2} className="min-h-screen px-4 py-6" />;

  const answerMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => put(`/products/questions/${id}/answer`, { answer }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller', 'qa'] }); toast.success('Answer posted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to post answer'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Q&A</h1>
          <p className="text-sm text-gray-500">Answer customer questions about your products</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Questions</option>
          <option value="unanswered">Unanswered</option>
          <option value="answered">Answered</option>
        </select>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Questions Yet</h3>
          <p className="text-sm text-gray-500">Customers haven't asked any questions about your products.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Product: {q.product?.title || 'Unknown'} | {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {q.answer && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
              </div>
              {q.answer ? (
                <div className="ml-4 pl-3 border-l-2 border-orange-200">
                  <p className="text-sm text-gray-600">{q.answer}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Answered {q.answeredAt ? new Date(q.answeredAt).toLocaleDateString() : ''}</p>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Write your answer..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && answers[q.id]) {
                        answerMutation.mutate({ id: q.id, answer: answers[q.id] });
                        setAnswers({ ...answers, [q.id]: '' });
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (answers[q.id]) { answerMutation.mutate({ id: q.id, answer: answers[q.id] }); setAnswers({ ...answers, [q.id]: '' }); } }}
                    disabled={!answers[q.id]}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}