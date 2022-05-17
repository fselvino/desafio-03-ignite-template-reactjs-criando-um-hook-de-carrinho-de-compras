
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart')

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(()=>{
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(()=> {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {

    const updatedCart = [...cart]    

    try {   
      
      //verificar se existe o produto
      const productsExists = updatedCart.find(product => product.id === productId)     

       //levanta o stoque de produto requisitado 
      const stock = await api.get(`/stock/${productId}`)

      //verifica a quantidade de intençao de compra  
      const stockAmount = stock.data.amount

      //levanta a quantidade existente do produto no carrinho, se existir pega a quantidade senão e zero
      const currentAmount = productsExists ? productsExists.amount: 0

      //recebe a quantidade desejada de compra 
      const amount = currentAmount +1

      //testa se a quantidade desejada e maior que o estoque
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      //testa se exite o produto existindo atualiza a quantidade de produto na sacola
      if(productsExists){
          productsExists.amount = amount

      //se não existir o produto na carrinho ele adiciona o produto.
      }else {

      //se for produto novo cria um novo produto e adiciona em um
        const product = await api.get(`/products/${productId}`)
        const newProduct = {
          ...product.data,
          amount: 1
        }
        //atualiza o carrinho
        updatedCart.push(newProduct)
      }
      //persiste no carrinho
      setCart(updatedCart)
      
      
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id ===productId)

      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)      

      }else{
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0 ){          
        return
      }

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount

      if(amount > stockAmount){
        toast.error('Quantidade solicita fora de estoque')
        return
      }

      const updateCart = [...cart]
      const productExist = updateCart.find(product => product.id === productId)

      if(productExist) {
        productExist.amount = amount
        setCart(updateCart)
       
      }else{
        throw Error()
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
